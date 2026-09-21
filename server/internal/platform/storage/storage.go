package storage

import (
	"context"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"

	"github.com/semmidev/url-shortener/server/internal/config"
)

// Provider abstracts object storage operations (AWS S3, RustFS, MinIO).
type Provider interface {
	GeneratePresignedUploadURL(ctx context.Context, key string, contentType string, expires time.Duration) (uploadURL string, publicURL string, err error)
	UploadFile(ctx context.Context, key string, body io.Reader, contentType string) (publicURL string, err error)
	DeleteFile(ctx context.Context, key string) error
	GetPublicURL(key string) string
}

// S3Provider implements Provider interface backed by AWS S3 / RustFS.
type S3Provider struct {
	client        *s3.Client
	presignClient *s3.PresignClient
	cfg           config.Config
}

// NewS3Provider constructs a new S3 / RustFS storage provider.
func NewS3Provider(ctx context.Context, cfg config.Config) (*S3Provider, error) {
	if cfg.S3Bucket == "" {
		return nil, errors.New("S3 bucket name is not configured")
	}

	region := cfg.S3Region
	if region == "" {
		region = "us-east-1"
	}

	accessKey := cfg.S3AccessKeyID
	if accessKey == "" {
		accessKey = "admin"
	}

	secretKey := cfg.S3SecretAccessKey
	if secretKey == "" {
		secretKey = "password123"
	}

	awsCfg, err := awsconfig.LoadDefaultConfig(ctx,
		awsconfig.WithRegion(region),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			accessKey,
			secretKey,
			"",
		)),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS S3 config: %w", err)
	}

	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.UsePathStyle = cfg.S3UsePathStyle
		if cfg.S3Endpoint != "" {
			o.BaseEndpoint = aws.String(cfg.S3Endpoint)
		}
	})

	presignClient := s3.NewPresignClient(client)

	provider := &S3Provider{
		client:        client,
		presignClient: presignClient,
		cfg:           cfg,
	}

	// Ensure bucket exists in background with timeout (RustFS / MinIO)
	go func() { //nolint:gosec // background context for asynchronous initialization
		ctxTimeout, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		_ = provider.ensureBucketExists(ctxTimeout)
	}()

	return provider, nil
}

func (p *S3Provider) ensureBucketExists(ctx context.Context) error {
	_, err := p.client.HeadBucket(ctx, &s3.HeadBucketInput{
		Bucket: aws.String(p.cfg.S3Bucket),
	})
	if err != nil {
		// Attempt to create bucket
		_, createErr := p.client.CreateBucket(ctx, &s3.CreateBucketInput{
			Bucket: aws.String(p.cfg.S3Bucket),
		})
		if createErr != nil {
			var alreadyOwned *types.BucketAlreadyOwnedByYou
			var alreadyExists *types.BucketAlreadyExists
			if !errors.As(createErr, &alreadyOwned) && !errors.As(createErr, &alreadyExists) {
				return createErr
			}
		}
	}
	return nil
}

// GetPublicURL formats the public accessible URL for a given S3 object key.
func (p *S3Provider) GetPublicURL(key string) string {
	cleanKey := strings.TrimPrefix(key, "/")

	if p.cfg.S3PublicURL != "" {
		base := strings.TrimSuffix(p.cfg.S3PublicURL, "/")
		return fmt.Sprintf("%s/%s", base, cleanKey)
	}

	if p.cfg.S3Endpoint != "" {
		base := strings.TrimSuffix(p.cfg.S3Endpoint, "/")
		if p.cfg.S3UsePathStyle {
			return fmt.Sprintf("%s/%s/%s", base, p.cfg.S3Bucket, cleanKey)
		}
		return fmt.Sprintf("%s/%s", base, cleanKey)
	}

	return fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", p.cfg.S3Bucket, p.cfg.S3Region, cleanKey)
}

// GeneratePresignedUploadURL creates a presigned PUT URL for direct browser-to-S3 uploads.
func (p *S3Provider) GeneratePresignedUploadURL(ctx context.Context, key string, contentType string, expires time.Duration) (uploadURL string, publicURL string, err error) {
	cleanKey := strings.TrimPrefix(key, "/")

	req, err := p.presignClient.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(p.cfg.S3Bucket),
		Key:         aws.String(cleanKey),
		ContentType: aws.String(contentType),
	}, s3.WithPresignExpires(expires))
	if err != nil {
		return "", "", fmt.Errorf("failed to generate S3 presigned upload URL: %w", err)
	}

	return req.URL, p.GetPublicURL(cleanKey), nil
}

// UploadFile streams binary data directly from server into S3 (used for Google avatar auto-sync).
func (p *S3Provider) UploadFile(ctx context.Context, key string, body io.Reader, contentType string) (string, error) {
	cleanKey := strings.TrimPrefix(key, "/")

	_, err := p.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(p.cfg.S3Bucket),
		Key:         aws.String(cleanKey),
		Body:        body,
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload object to S3: %w", err)
	}

	return p.GetPublicURL(cleanKey), nil
}

// DeleteFile removes an object from S3.
func (p *S3Provider) DeleteFile(ctx context.Context, key string) error {
	cleanKey := strings.TrimPrefix(key, "/")

	_, err := p.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(p.cfg.S3Bucket),
		Key:    aws.String(cleanKey),
	})
	if err != nil {
		return fmt.Errorf("failed to delete object from S3: %w", err)
	}
	return nil
}

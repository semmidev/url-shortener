package url

const (
	// DefaultCodeLength is the standard length for randomly generated Base62 short codes.
	DefaultCodeLength = 7

	// MaxGenerateAttempts is the maximum number of retries to generate a unique short code.
	MaxGenerateAttempts = 5

	// Base62Chars defines the character set used for generating short URL codes.
	Base62Chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
)

package validator

import (
	"net/url"
	"os"
	"reflect"
	"regexp"
	"strings"
	"sync"

	"github.com/go-playground/locales/en"
	idlocale "github.com/go-playground/locales/id"
	ut "github.com/go-playground/universal-translator"
	"github.com/go-playground/validator/v10"
	idtranslations "github.com/go-playground/validator/v10/translations/id"
	"github.com/semmidev/url-shortener/server/internal/platform/apperr"
)

var (
	instance *validator.Validate
	uni      *ut.UniversalTranslator
	transID  ut.Translator
	once     sync.Once
)

var customCodeRegex = regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)

func initValidator() (*validator.Validate, ut.Translator) {
	once.Do(func() {
		instance = validator.New()

		// Register json tag names for error field keys
		instance.RegisterTagNameFunc(func(fld reflect.StructField) string {
			name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
			if name == "-" {
				return ""
			}
			return name
		})

		// Setup universal-translator with Indonesian and English fallback
		idLoc := idlocale.New()
		enLoc := en.New()
		uni = ut.New(enLoc, idLoc)

		var found bool
		transID, found = uni.GetTranslator("id")
		if !found {
			transID, _ = uni.GetTranslator("en")
		}

		// Register default Indonesian translations
		_ = idtranslations.RegisterDefaultTranslations(instance, transID)

		// Custom validation rules
		_ = instance.RegisterValidation("alphanum_dash", validateAlphaNumDash)
		_ = instance.RegisterValidation("http_url", validateHTTPURL)

		// Register custom translation overrides to ensure field names are NOT repeated in values
		registerCustomTranslations(instance, transID)
	})

	return instance, transID
}

func registerCustomTranslations(v *validator.Validate, trans ut.Translator) {
	// 1. required: "wajib diisi"
	_ = v.RegisterTranslation("required", trans, func(ut ut.Translator) error {
		return ut.Add("required", "wajib diisi", true)
	}, func(ut ut.Translator, fe validator.FieldError) string {
		t, _ := ut.T("required")
		return t
	})

	// 2. email: "harus berupa alamat email yang valid"
	_ = v.RegisterTranslation("email", trans, func(ut ut.Translator) error {
		return ut.Add("email", "harus berupa alamat email yang valid", true)
	}, func(ut ut.Translator, fe validator.FieldError) string {
		t, _ := ut.T("email")
		return t
	})

	// 3. min: "minimal {0} karakter"
	_ = v.RegisterTranslation("min", trans, func(ut ut.Translator) error {
		return ut.Add("min", "minimal {0} karakter", true)
	}, func(ut ut.Translator, fe validator.FieldError) string {
		t, _ := ut.T("min", fe.Param())
		return t
	})

	// 4. max: "maksimal {0} karakter"
	_ = v.RegisterTranslation("max", trans, func(ut ut.Translator) error {
		return ut.Add("max", "maksimal {0} karakter", true)
	}, func(ut ut.Translator, fe validator.FieldError) string {
		t, _ := ut.T("max", fe.Param())
		return t
	})

	// 5. http_url: "harus berupa URL HTTP atau HTTPS yang valid"
	_ = v.RegisterTranslation("http_url", trans, func(ut ut.Translator) error {
		return ut.Add("http_url", "harus berupa URL HTTP atau HTTPS yang valid", true)
	}, func(ut ut.Translator, fe validator.FieldError) string {
		t, _ := ut.T("http_url")
		return t
	})

	// 6. alphanum_dash: "hanya boleh berisi karakter alfanumerik, tanda hubung (-), atau garis bawah (_)"
	_ = v.RegisterTranslation("alphanum_dash", trans, func(ut ut.Translator) error {
		return ut.Add("alphanum_dash", "hanya boleh berisi karakter alfanumerik, tanda hubung (-), atau garis bawah (_)", true)
	}, func(ut ut.Translator, fe validator.FieldError) string {
		t, _ := ut.T("alphanum_dash")
		return t
	})

	// 7. url: "harus berupa URL yang valid"
	_ = v.RegisterTranslation("url", trans, func(ut ut.Translator) error {
		return ut.Add("url", "harus berupa URL HTTP atau HTTPS yang valid", true)
	}, func(ut ut.Translator, fe validator.FieldError) string {
		t, _ := ut.T("url")
		return t
	})
}

func validateAlphaNumDash(fl validator.FieldLevel) bool {
	v := fl.Field().String()
	if v == "" {
		return true
	}
	return customCodeRegex.MatchString(v)
}

func validateHTTPURL(fl validator.FieldLevel) bool {
	v := fl.Field().String()
	if v == "" {
		return true
	}
	u, err := url.ParseRequestURI(v)
	if err != nil {
		return false
	}
	return u.Scheme == "http" || u.Scheme == "https"
}

// ValidateStruct validates a struct using go-playground/validator configured by APP_LOCALE env variable.
func ValidateStruct(s any) map[string]string {
	locale := os.Getenv("APP_LOCALE")
	if locale == "" {
		locale = "id"
	}
	return ValidateStructWithLocale(s, locale)
}

// ValidateStructWithLocale validates a struct using go-playground/validator for a target locale.
func ValidateStructWithLocale(s any, locale string) map[string]string {
	v, defaultTrans := initValidator()
	trans := defaultTrans

	if locale != "" && locale != "id" && uni != nil {
		if t, found := uni.GetTranslator(locale); found {
			trans = t
		}
	}

	err := v.Struct(s)
	if err == nil {
		return nil
	}

	errs, ok := err.(validator.ValidationErrors)
	if !ok {
		return map[string]string{"_error": err.Error()}
	}

	res := make(map[string]string, len(errs))
	for _, e := range errs {
		res[e.Field()] = e.Translate(trans)
	}
	return res
}

// Check validates struct and returns apperr.ValidationFailed if there are validation errors.
func Check(s any) error {
	fields := ValidateStruct(s)
	if len(fields) > 0 {
		return apperr.ValidationFailed(fields)
	}
	return nil
}

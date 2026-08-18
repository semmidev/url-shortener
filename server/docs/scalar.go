package docs

import _ "embed"

// ScalarHTML contains the embedded modern Scalar API Reference UI HTML template.
//
//go:embed scalar.html
var ScalarHTML []byte

package tree_sitter_systemrdl_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_systemrdl "git+github.com/systemrdl/tree-sitter-systemrdl.git/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_systemrdl.Language())
	if language == nil {
		t.Errorf("Error loading Systerm RDL 2.0 grammar")
	}
}

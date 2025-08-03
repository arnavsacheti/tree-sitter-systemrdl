import XCTest
import SwiftTreeSitter
import TreeSitterSystemrdl

final class TreeSitterSystemrdlTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_systemrdl())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Systerm RDL 2.0 grammar")
    }
}

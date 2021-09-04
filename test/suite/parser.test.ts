/* eslint-disable @typescript-eslint/naming-convention */

import * as assert from "assert";
import * as vscode from "vscode";
import * as parser from "../../src/parser";

suite("Parser Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("Parses line successfully", () => {
    const warnings = parser.parseLines([
      '{"path": "test/path/file.proto","start_line": 10,"start_column": 1,"end_line": 10,"end_column": 19,"type": "PACKAGE_DIRECTORY_MATCH","message": "Files with package \\"test.path.v1\\" must be within a directory \\"test/path/v1\\" relative to root but were in directory \\"test/path\\"."}',
    ]);
    const want: parser.Warning[] = [
      {
        path: "test/path/file.proto",
        type: "PACKAGE_DIRECTORY_MATCH",
        start_line: 10,
        start_column: 1,
        end_line: 10,
        end_column: 19,
        message:
          'Files with package "test.path.v1" must be within a directory "test/path/v1" relative to root but were in directory "test/path".',
      },
    ];
    assert.deepStrictEqual(warnings, want);
  });
});

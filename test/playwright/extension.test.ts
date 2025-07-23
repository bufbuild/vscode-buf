import * as fs from "fs";
import * as path from "path";
import { test, expect } from "./base-test";

const baseBufYaml = `version: v2`;

// The formatter will only format files with no errors, so we ignore the lint issues present
// in the buf.yaml for formatting only.
const formatBufYaml = `version: v2
lint:
  except:
    - PACKAGE_DIRECTORY_MATCH
    - RPC_RESPONSE_STANDARD_NAME
  rpc_allow_google_protobuf_empty_requests: true
  rpc_allow_google_protobuf_empty_responses: true
`;

const baseBufGenYaml = `version: v2
managed:
  enabled: true
plugins:
  - remote: buf.build/bufbuild/es:v2.2.2
    out: gen-es
    opt: target=ts

inputs:
  - module: buf.build/bufbuild/registry`;

const exampleUserProto = `syntax = "proto3";

package example.v1;

import "google/protobuf/empty.proto";
import "google/protobuf/timestamp.proto";

// UserService is a simple example service that demonstrates
// basic CRUD operations for user management.
service UserService {
  // GetUser retrieves a user by ID
  rpc GetUser(GetUserRequest) returns (GetUserResponse) {}

  // ListUsers retrieves all users with optional filtering
  rpc ListUsers(ListUsersRequest) returns (ListUsersResponse) {}

  // CreateUser creates a new user
  rpc CreateUser(CreateUserRequest) returns (CreateUserResponse) {}

  // UpdateUser updates an existing user
  rpc UpdateUser(UpdateUserRequest) returns (UpdateUserResponse) {}

  // DeleteUser removes a user by ID
  rpc DeleteUser(DeleteUserRequest) returns (google.protobuf.Empty) {}

  // StreamUserUpdates provides a stream of user updates
  rpc StreamUserUpdates(google.protobuf.Empty) returns (stream UserEvent) {}
}

// User represents a user in the system
message User {
  string id = 1;
  string email = 2;
  string display_name = 3;
  google.protobuf.Timestamp created_at = 4;
  google.protobuf.Timestamp updated_at = 5;
  UserStatus status = 6;
  UserRole role = 7;

  // Address is a nested message type
  message Address {
    string street = 1;
    string city = 2;
    string state = 3;
    string country = 4;
    string postal_code = 5;

    // AddressType defines the type of address
    enum AddressType {
      ADDRESS_TYPE_UNSPECIFIED = 0;
      ADDRESS_TYPE_HOME = 1;
      ADDRESS_TYPE_WORK = 2;
      ADDRESS_TYPE_BILLING = 3;
      ADDRESS_TYPE_SHIPPING = 4;
    }

    AddressType type = 6;
  }

  repeated Address addresses = 8;
  map<string, string> metadata = 9;

  reserved 10, 11, 12;
  reserved "password", "secret";
}

// UserStatus represents the status of a user account
enum UserStatus {
  USER_STATUS_UNSPECIFIED = 0;
  USER_STATUS_ACTIVE = 1;
  USER_STATUS_INACTIVE = 2;
  USER_STATUS_SUSPENDED = 3;
  USER_STATUS_PENDING = 4;
}

// UserRole defines the role of a user
enum UserRole {
  USER_ROLE_UNSPECIFIED = 0;
  USER_ROLE_ADMIN = 1;
  USER_ROLE_USER = 2;
  USER_ROLE_MODERATOR = 3;
  USER_ROLE_GUEST = 4;
}

message GetUserRequest {
  string user_id = 1;
}

message GetUserResponse {
  User user = 1;
}

message ListUsersRequest {
  // Pagination parameters
  int32 page_size = 1;
  string page_token = 2;

  // Optional filters
  optional UserStatus status = 3;
  optional UserRole role = 4;
  repeated string user_ids = 5;

  oneof time_filter {
    google.protobuf.Timestamp created_after = 6;
    google.protobuf.Timestamp created_before = 7;
  }
}

message ListUsersResponse {
  repeated User users = 1;
  string next_page_token = 2;
  int32 total_count = 3;
}

message CreateUserRequest {
  string email = 1;
  string display_name = 2;
  optional UserRole role = 3;
  repeated User.Address addresses = 4;
  map<string, string> metadata = 5;
}

message CreateUserResponse {
  User user = 1;
}

message UpdateUserRequest {
  string user_id = 1;

  // Fields to update
  optional string email = 2;
  optional string display_name = 3;
  optional UserStatus status = 4;
  optional UserRole role = 5;
  repeated User.Address addresses = 6;
  map<string, string> metadata = 7;
}

message UpdateUserResponse {
  User user = 1;
}

message DeleteUserRequest {
  string user_id = 1;
  bool hard_delete = 2; // If true, permanently deletes the user
}

// UserEvent represents an event related to a user
message UserEvent {
  enum EventType {
    EVENT_TYPE_UNSPECIFIED = 0;
    EVENT_TYPE_CREATED = 1;
    EVENT_TYPE_UPDATED = 2;
    EVENT_TYPE_DELETED = 3;
    EVENT_TYPE_STATUS_CHANGED = 4;
  }

  EventType event_type = 1;
  string user_id = 2;
  google.protobuf.Timestamp timestamp = 3;
  User user = 4;
}
`;

const unformattedExampleUserProto = `syntax = "proto3";

package example.v1;

import "google/protobuf/timestamp.proto";
import "google/protobuf/empty.proto";

// UserService is a simple example service that demonstrates
// basic CRUD operations for user management.
service UserService {
  // GetUser retrieves a user by ID
  rpc GetUser(GetUserRequest) returns (GetUserResponse) {}

  // ListUsers retrieves all users with optional filtering
  rpc ListUsers(ListUsersRequest) returns (ListUsersResponse) {}

  // CreateUser creates a new user
  rpc         CreateUser(CreateUserRequest) returns (CreateUserResponse) {}

  // UpdateUser updates an existing user
  rpc UpdateUser(UpdateUserRequest) returns (UpdateUserResponse) {}

  // DeleteUser removes a user by ID
  rpc DeleteUser(DeleteUserRequest) returns (google.protobuf.Empty) {}

  // StreamUserUpdates provides a stream of user updates
  rpc StreamUserUpdates(google.protobuf.Empty) returns (stream UserEvent) {}
}

// User represents a user in the system
message User {
  string id = 1;
  string email = 2;
  string display_name = 3;
  google.protobuf.Timestamp created_at               = 4;
  google.protobuf.Timestamp updated_at = 5;
  UserStatus status = 6;
  UserRole role = 7;

  // Address is a nested message type
  message Address {
    string street = 1           ;
    string city = 2;
    string state = 3;
    string country = 4;
    string postal_code = 5;

    // AddressType defines the type of address
    enum AddressType {
      ADDRESS_TYPE_UNSPECIFIED = 0;
      ADDRESS_TYPE_HOME = 1;
      ADDRESS_TYPE_WORK = 2;
      ADDRESS_TYPE_BILLING = 3;
      ADDRESS_TYPE_SHIPPING = 4;
    }

    AddressType type = 6;
  }

  repeated Address addresses = 8;
  map<string, string> metadata = 9;

  reserved 10, 11, 12;
  reserved "password", "secret";
}

// UserStatus represents the status of a user account
enum UserStatus {
  USER_STATUS_UNSPECIFIED = 0;
  USER_STATUS_ACTIVE = 1;
  USER_STATUS_INACTIVE = 2;
  USER_STATUS_SUSPENDED = 3;
  USER_STATUS_PENDING = 4;
}

// UserRole defines the role of a user
enum UserRole {
  USER_ROLE_UNSPECIFIED = 0;
  USER_ROLE_ADMIN = 1;
  USER_ROLE_USER = 2;
  USER_ROLE_MODERATOR = 3;
  USER_ROLE_GUEST = 4;
}

message GetUserRequest {
  string user_id = 1;
}

message GetUserResponse {
  User user = 1;
}

message ListUsersRequest {
  // Pagination parameters
  int32 page_size = 1;
  string page_token = 2;

  // Optional filters
  optional UserStatus status = 3;
  optional UserRole role = 4;
  repeated string user_ids = 5;

  oneof time_filter {
    google.protobuf.Timestamp created_after = 6;
    google.protobuf.Timestamp created_before = 7;
  }
}

message ListUsersResponse {
  repeated User users = 1;
  string next_page_token = 2;
  int32 total_count = 3;
}

message CreateUserRequest {
  string email = 1;
  string display_name = 2;
  optional UserRole role = 3;
  repeated User.Address addresses = 4;
  map<string, string> metadata = 5;
}

message CreateUserResponse {
  User user = 1;
}

message UpdateUserRequest {
  string user_id = 1;

  // Fields to update
  optional string email = 2;
  optional string display_name = 3;
  optional UserStatus status = 4;
  optional UserRole role = 5;
  repeated User.Address addresses = 6;
  map<string, string> metadata = 7;
}

message UpdateUserResponse {
  User user = 1;
}

message DeleteUserRequest {
  string user_id = 1;
  bool hard_delete = 2;  // If true, permanently deletes the user
}

// UserEvent represents an event related to a user
message UserEvent {
  enum EventType {
    EVENT_TYPE_UNSPECIFIED = 0;
    EVENT_TYPE_CREATED = 1;
    EVENT_TYPE_UPDATED = 2;
    EVENT_TYPE_DELETED = 3;
    EVENT_TYPE_STATUS_CHANGED = 4;
  }

  EventType event_type = 1;
  string user_id = 2;
  google.protobuf.Timestamp timestamp = 3;
  User user = 4;
}
`;

/**
 * A test that provides a fixture for initialising project files.
 *
 * @param fileContents is a Record<string, string> of file names to contents.
 * @param activateFileName is an optional file name to activate (click in the file explorer)
 * after creating the files in the project.
 * @param projectPath is passed through from test and is the path of the project folder.
 */
const extensionTest = test.extend<{
  fileContents: Record<string, string>;
  activateFileName: string;
  projectPath: string;
}>({
  // Default file contents for extension tests.
  fileContents: {
    "buf.gen.yaml": baseBufGenYaml,
    "buf.yaml": baseBufYaml,
    "example.proto": exampleUserProto,
  },
  activateFileName: "",
  page: async (
    { workbox: { page, createFile }, fileContents, activateFileName },
    use
  ) => {
    for (const [fileName, fileContent] of Object.entries(fileContents)) {
      await createFile(fileName, fileContent);
    }
    // Reload entire window to pick up new files
    await page.keyboard.press("ControlOrMeta+KeyR");
    if (activateFileName) {
      // Highlight the proto file in explorer
      await page
        .getByRole("treeitem", { name: "example.proto" })
        .locator("a")
        .click();
    }
    await use(page);
  },
  projectPath: ({ workbox: { projectPath } }, use) => {
    use(projectPath);
  },
});

extensionTest.describe("status bar", async () => {
  extensionTest.use({ activateFileName: "example.proto" });
  extensionTest("toolbar displays successful running lsp", async ({ page }) => {
    // Validate that buf lsp is displaying success in the status bar
    await expect(page.getByRole("button", { name: "check Buf" })).toBeVisible();
  });
});

extensionTest.describe("command palette", async () => {
  extensionTest.use({ activateFileName: "example.proto" });
  extensionTest("command palette contents", async ({ page }) => {
    await page.getByRole("button", { name: "check Buf" }).click();
    const expectations = [
      "Start Buf Language Server",
      "Stop Buf Language Server",
      "Generate",
      "Install CLI",
      "Update CLI",
      "Show Buf Output",
    ];
    for (const expectation of expectations) {
      await expect(
        page.getByRole("option", { name: expectation })
      ).toBeVisible();
    }
    const commandPaletteOptions = await page.getByRole("option").all();
    expect(commandPaletteOptions).toHaveLength(expectations.length);
  });
  extensionTest("show output", async ({ page }) => {
    await page.getByRole("button", { name: "check Buf" }).click();
    await page.getByRole("option", { name: "Show Buf Output" }).click();
    // This is based on the name of the output channel set in log.ts.
    expect(page.getByRole("combobox")).toHaveValue("Buf");
  });
  extensionTest("buf generate", async ({ page }) => {
    await page.getByRole("button", { name: "check Buf" }).click();
    await page.getByRole("option", { name: "Generate" }).click();
    // Generate should be successful and a new directory should be created. This is based
    // on the buf.gen.yaml.
    await expect(page.getByRole("treeitem", { name: "gen-es" })).toBeVisible();
  });
});

extensionTest.describe("lsp", async () => {
  extensionTest.use({ activateFileName: "example.proto" });
  extensionTest("stop and start lsp", async ({ page }) => {
    // Use the command palette to stop the LSP
    await page.getByRole("button", { name: "check Buf" }).click();
    await page
      .getByRole("option", { name: "Stop Buf Language Server" })
      .click();
    await expect(
      page.getByRole("button", {
        name: RegExp(`^x Buf ([0-9]+.[0-9]+.[0-9]+)*`),
      })
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: RegExp(`^x Buf ([0-9]+.[0-9]+.[0-9]+)*`),
      })
      .hover();
    await expect(page.getByText("Restart language server")).toBeVisible();

    // Start the server back up using the button
    await page
      .getByRole("button", {
        name: RegExp(`^x Buf ([0-9]+.[0-9]+.[0-9]+)*`),
      })
      .click();
    await expect(page.getByRole("button", { name: "check Buf" })).toBeVisible();
  });
  extensionTest("go-to definition", async ({ page }) => {
    // Ensure that the LSP is running
    await expect(page.getByRole("button", { name: "check Buf" })).toBeVisible();
    await page.getByText("GetUserRequest", { exact: true }).click();
    await page.keyboard.press("F12");
    expect(page.locator(".active-line-number")).toContainText("85");
  });
  extensionTest.describe("format on-save", async () => {
    extensionTest.use({
      fileContents: {
        "buf.gen.yaml": baseBufGenYaml,
        "buf.yaml": formatBufYaml,
        "example.proto": unformattedExampleUserProto,
      },
      activateFileName: "example.proto",
    });
    extensionTest("format", async ({ page, projectPath }) => {
      // Ensure that the LSP is running
      await expect(
        page.getByRole("button", { name: "check Buf" })
      ).toBeVisible();
      
      const { promise, resolve, reject } = Promise.withResolvers<string>();
      const watcher = fs.watch(path.join(projectPath, "example.proto"));
      watcher.on("change", () => {
        watcher.close();
        fs.readFile(
          path.join(projectPath, "example.proto"),
          { encoding: "utf8" },
          (err, data) => {
            if (err) {
              reject(err);
            }
            resolve(data.toString());
          }
        );
      });

      await page.keyboard.press("ControlOrMeta+KeyS");
      const currentContent = await promise;
      expect(currentContent).toBe(exampleUserProto);
    });
  });
  extensionTest("hover", async ({ page }) => {
    // Ensure that the LSP is running
    await expect(page.getByRole("button", { name: "check Buf" })).toBeVisible();
    await page.getByText("ListUsersRequest", { exact: true }).hover();
    await expect(
      page.locator(".monaco-hover-content").filter({ visible: true })
    ).toContainText(
      // LSP handles missing documentation in hovers
      "message example.v1.ListUsersRequest<missing docs>"
    );
    await page.getByText("User", { exact: true }).hover();
    await expect(
      page.locator(".monaco-hover-content").filter({ visible: true })
    ).toContainText(
      // LSP shows the documentation for types that have it
      "message example.v1.User User represents a user in the system"
    );
  });
  extensionTest("lint checks", async ({ page }) => {
    // Ensure that the LSP is running
    await expect(page.getByRole("button", { name: "check Buf" })).toBeVisible();

    await page.getByText("example.v1", { exact: true }).hover();
    await expect(
      page.locator(".monaco-hover-content").filter({ visible: true })
    ).toContainText("(PACKAGE_DIRECTORY_MATCH)");

    await page.getByText("DeleteUserRequest", { exact: true }).hover();
    await expect(
      page.locator(".monaco-hover-content").filter({ visible: true })
    ).toContainText("(RPC_REQUEST_RESPONSE_UNIQUE)");

    await page.getByText("UserEvent", { exact: true }).hover();
    await expect(
      page.locator(".monaco-hover-content").filter({ visible: true })
    ).toContainText("(RPC_REQUEST_RESPONSE_UNIQUE)");
  });
});

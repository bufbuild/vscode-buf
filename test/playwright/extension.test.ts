import { test, expect } from "./base-test";

const baseBufYaml = `version: v2

modules:
  - path: example
    name: example`;

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

// GetUserRequest is used to retrieve a user by ID
message GetUserRequest {
  string user_id = 1;
}

// GetUserResponse contains the user data
message GetUserResponse {
  User user = 1;
}

// ListUsersRequest is used to retrieve multiple users
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

// ListUsersResponse contains a paginated list of users
message ListUsersResponse {
  repeated User users = 1;
  string next_page_token = 2;
  int32 total_count = 3;
}

// CreateUserRequest is used to create a new user
message CreateUserRequest {
  string email = 1;
  string display_name = 2;
  optional UserRole role = 3;
  repeated User.Address addresses = 4;
  map<string, string> metadata = 5;
}

// CreateUserResponse contains the created user data
message CreateUserResponse {
  User user = 1;
}

// UpdateUserRequest is used to update an existing user
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

// UpdateUserResponse contains the updated user data
message UpdateUserResponse {
  User user = 1;
}

// DeleteUserRequest is used to delete a user
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

test.beforeEach(async ({ workbox: { page, createFile } }) => {
  await createFile("buf.gen.yaml", baseBufGenYaml);
  await createFile("buf.yaml", baseBufYaml);
  await createFile("example.proto", exampleUserProto);
  // Highlight the proto file in explorer
  await page
    .getByRole("treeitem", { name: "example.proto" })
    .locator("a")
    .click();
});

test("toolbar displays successful running lsp", async ({
  workbox: { page },
}) => {
  // Validate that buf lsp is displaying success in the
  await expect(page.getByRole("button", { name: "check Buf" })).toBeVisible();
});

test("open command palette and run generate", async ({ workbox: { page } }) => {
  await page.getByRole("button", { name: "check Buf" }).click();
  // Note the double space is necessayr to match
  await page.getByRole("option", { name: "Generate" }).click();
  // Generate should be successful and a new directory should be created
  await expect(page.getByRole("treeitem", { name: "gen-es" })).toBeVisible();
});

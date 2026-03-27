# OpenNeutron API Documentation

This document outlines the API endpoints, request/response DTOs, and JSON formats for the OpenNeutron application.

## Authentication

All secure endpoints require a JWT token in the `Authorization` header: `Bearer <token>`.

## DTOs Overview

- **Base64 Usage**: Fields containing binary data (e.g., `public_key`, `data` in email DTOs) are base64-encoded strings.
- **Error Responses**: All endpoints can return `ErrorResponse` on failure.

### Common DTOs

#### ErrorResponse
```json
{
  "error": "string"
}
```

#### MessageResponse
```json
{
  "message": "string"
}
```

## Endpoints

### Open Routes (No Auth Required)

#### POST /auth/login
**Request**: `LoginRequest`
```json
{
  "username": "string",
  "password": "string"
}
```
**Response**: `LoginResponse`
```json
{
  "token": "string",
  "force_reset": false,
  "username": "string",
  "public_key": "base64-string|null",
  "unread_emails": 0
}
```

> **`force_reset`**: When `true`, the user has no password set and must set one before normal use. This is always `true` for accounts provisioned by an admin. The client should redirect to a password-setup flow and call the appropriate endpoint to set the password.

#### POST /user/register
**Request**: `CreateUserRequest`
```json
{
  "username": "string",
  "password": "string",
  "public_key": "base64-string"
}
```
**Response**: `MessageResponse`
```json
{
  "message": "User created"
}
```

### Secure Routes (JWT Required)

#### GET /user/me
#### GET /me
**Request**: None
**Response**: `UserDto`
```json
{
  "uid": "string",
  "username": "string",
  "email": "string",  # user email (username@domain)
  "user_created": 1234567890,
  "last_login": 1234567890,
  "email_count": 0,
  "is_admin": false
}
```

#### POST /user/setup
Used during the initial account setup flow. When a user receives `force_reset: true` after login (i.e. the account was provisioned by an admin and has no password yet), they must call this endpoint to define their password and public key before normal use. All cryptographic operations are performed client-side — `password` is a hash string and `public_key` is base64-encoded. Only works while the account is in the `force_reset` state; returns `409` if a password is already set.

**Request**: `SetupPasswordRequest`
```json
{
  "password": "sha256-hash-string",
  "public_key": "base64-string"
}
```
**Response**: `MessageResponse`
```json
{
  "message": "Password set"
}
```

> **Flow**:
> 1. Admin creates user via `POST /admin/users` → `force_reset: true`
> 2. User logs in with any password → receives token + `force_reset: true`
> 3. Client calls `POST /user/setup` with the Bearer token, chosen password hash, and public key
> 4. Server stores the credentials; subsequent logins return `force_reset: false`

#### GET /admin/users
**Request**: None
**Response**: `AdminUsersResponse`
```json
{
  "users": [
    {
      "uid": "string",
      "username": "string",
      "user_created": 1234567890,
      "last_login": 1234567890,
      "email_count": 0,
      "is_admin": false
    }
  ],
  "total": 1
}
```

#### POST /admin/users
Creates a new user account with no password. The user must set their own password on first login (indicated by `force_reset: true` in the login response and in this response).

**Request**: `AdminCreateUserRequest`
```json
{
  "username": "string"
}
```
**Response**: `AdminCreateUserResponse`
```json
{
  "message": "User created",
  "force_reset": true
}
```

> **`force_reset`** is always `true` here — it confirms that the created account has no password and the user will be required to define one on first login.

#### DELETE /admin/users
**Request**: `AdminDeleteUserRequest`
```json
{
  "username": "string"
}
```
**Response**: `MessageResponse`
```json
{
  "message": "User deleted"
}
```

#### GET /admin/disk-usage
**Request**: None
**Response**: `AdminDiskUsageResponse`
```json
{
  "users": [
    {
      "username": "string",
      "email_count": 0,
      "disk_usage_bytes": 0
    }
  ]
}
```

#### POST /email/get
**Request**: `GetEmailRequest`
```json
{
  "uid": 12345678901234567890
}
```
**Response**: `EmailBytesResponse`
```json
{
  "uid": 12345678901234567890,
  "data": "base64-encoded-email-bytes"
}
```

#### POST /email/bulk
**Request**: `GetEmailsBulkRequest`
```json
{
  "uids": [12345678901234567890, 12345678901234567891]
}
```
**Response**: `EmailsBulkResponse`
```json
{
  "emails": [
    {
      "uid": 12345678901234567890,
      "data": "base64-encoded-email-bytes"
    }
  ]
}
```

#### POST /email/list
**Request**: None
**Response**: `EmailUidsResponse`
```json
{
  "uids": [12345678901234567890, 12345678901234567891]
}
```

#### POST /email/delete
**Request**: `DeleteEmailRequest`
```json
{
  "uid": 12345678901234567890
}
```
**Response**: `MessageResponse`
```json
{
  "message": "Email deleted"
}
```

#### POST /email/set
**Request**: `SetEmailBytesRequest`
```json
{
  "uid": 12345678901234567890,
  "data": "base64-encoded-email-bytes"
}
```
**Response**: `MessageResponse`
```json
{
  "message": "Email updated"
}
```

#### POST /email/recent
Returns the most recent email UIDs for the authenticated user, newest first, with offset-based pagination. All email IDs are returned in arrival order (oldest-first internally); this endpoint reverses that and applies `offset`/`limit`.

**Request**: `GetRecentEmailsRequest`
```json
{
  "offset": 0,
  "limit": 20
}
```
**Response**: `EmailUidsResponse`
```json
{
  "uids": [12345678901234567891, 12345678901234567890]
}
```

#### POST /email/send
Sends a raw email via an external SMTP server. The server performs STARTTLS opportunistically if advertised. No encryption is applied server-side; the bytes are forwarded as-is.

**Request**: `SendEmailRequest`
```json
{
  "from": "alice@example.com",
  "to": ["bob@remote.com"],
  "data": "base64-encoded-raw-email-bytes",
  "smtp_host": "mail.remote.com",
  "smtp_port": 587
}
```
> `smtp_port` is optional; defaults to `25`.

**Response**: `MessageResponse`
```json
{
  "message": "Email sent"
}
```

#### POST /email/read
Mark a single email as read.

**Request**: `MarkEmailReadRequest`
```json
{
  "uid": 12345678901234567890
}
```
**Response**: `MessageResponse`
```json
{
  "message": "Email marked as read"
}
```

#### POST /email/unread
Mark a single email as unread (reverse of `/email/read`).

**Request**: `MarkEmailReadRequest`
```json
{
  "uid": 12345678901234567890
}
```
**Response**: `MessageResponse`
```json
{
  "message": "Email marked as unread"
}
```

#### POST /email/star
Set or clear the starred flag on an email.

**Request**: `SetEmailStarredRequest`
```json
{
  "uid": 12345678901234567890,
  "starred": true
}
```
> Set `starred` to `false` to unstar.

**Response**: `MessageResponse`
```json
{
  "message": "Email starred"
}
```

---

### Email response shape (updated)

All endpoints that return email data (`/email/get`, `/email/bulk`) now include a `received_at` field:

**`EmailBytesResponse`**
```json
{
  "uid": 12345678901234567890,
  "data": "base64-encoded-email-bytes",
  "received_at": "2026-03-27T14:05:00Z"
}
```

> Emails also carry a `starred` boolean flag (set via `POST /email/star`). The flag is **not** included in `EmailBytesResponse` — it is a server-side metadata flag only. To star or unstar an email, use `POST /email/star`.

---

### Groups

Each user can have any number of named groups. A group stores references to emails by UID and a list of **filter addresses** — when an email arrives via SMTP whose `MAIL FROM` address matches a filter address, the email UID is automatically added to that group. Groups are stored inside the user record and flushed to disk on every mutation.

#### GroupDto
```json
{
  "uid": "string",
  "title": "string",
  "email_uids": [12345678901234567890],
  "filter_addresses": ["alice@example.com"]
}
```

#### GET /group/list
List all groups for the authenticated user.

**Request**: None  
**Response**: `GroupsListResponse`
```json
{
  "groups": [
    {
      "uid": "string",
      "title": "Work",
      "email_uids": [12345678901234567890],
      "filter_addresses": ["boss@work.com"]
    }
  ]
}
```

#### POST /group/create
Create a new group. Returns the created `GroupDto`.

**Request**: `CreateGroupRequest`
```json
{
  "title": "Work",
  "filter_addresses": ["boss@work.com", "hr@work.com"]
}
```
> `filter_addresses` is optional. Omit it (or pass an empty array) to create a group with no auto-routing rules.

**Response** (`201`): `GroupDto`

#### POST /group/get
Retrieve a single group by UID.

**Request**: `GetGroupRequest`
```json
{
  "uid": 12345678901234567890
}
```
**Response**: `GroupDto`

#### POST /group/update
Update a group's title and/or filter addresses. Omit a field to leave it unchanged. The returned `GroupDto` reflects the new state.

**Request**: `UpdateGroupRequest`
```json
{
  "uid": 12345678901234567890,
  "title": "New Title",
  "filter_addresses": ["new@example.com"]
}
```
**Response**: `GroupDto`

#### POST /group/delete
Delete a group. The emails referenced by the group are **not** deleted — only the group record itself is removed.

**Request**: `DeleteGroupRequest`
```json
{
  "uid": 12345678901234567890
}
```
**Response**: `MessageResponse`
```json
{
  "message": "Group deleted"
}
```

#### POST /group/add-email
Manually add an email UID to a group. The email must belong to the authenticated user.

**Request**: `GroupEmailRequest`
```json
{
  "group_uid": 12345678901234567890,
  "email_uid": 12345678901234567891
}
```
**Response**: `MessageResponse`
```json
{
  "message": "Email added to group"
}
```

#### POST /group/remove-email
Manually remove an email UID from a group. The email blob is **not** deleted.

**Request**: `GroupEmailRequest`
```json
{
  "group_uid": 12345678901234567890,
  "email_uid": 12345678901234567891
}
```
**Response**: `MessageResponse`
```json
{
  "message": "Email removed from group"
}
```

---

### Encrypted Sending Flow

The encrypted sending flow is a two-step process that allows clients to send end-to-end encrypted (or plain) emails while keeping a sender-side copy and individually delivering to each recipient.

#### Overview

1. **Resolve keys** — The client sends a list of recipient email addresses. The server returns the public key (if any) for each address that belongs to a local user. External addresses get `null` keys. The `type` field is `"none"` for now (reserved for future negotiated E2EE modes).

2. **Send encrypted** — The client prepares:
   - A **local copy** (the sender's own encrypted copy of the email, stored in `sentEmailIds`).
   - A **recipients map** — for each recipient address, the already-encrypted (or plaintext) email bytes. Local recipients are delivered directly; external recipients are DKIM-signed (if a signing key is configured) and sent via SMTP to the recipient's MX server.

#### Technical Details

- **DKIM signing**: On startup, the server loads the DKIM private key from `dkim.private_key_path` in `config.yml`. Each outgoing external email is individually signed with `rsa-sha256` / `relaxed/relaxed` canonicalization. The `DKIM-Signature` header is prepended to each message before SMTP delivery.
- **MX resolution**: For external recipients, the server performs a DNS MX lookup on the recipient's domain and connects to the highest-priority MX host on port 25 with opportunistic STARTTLS.
- **EHLO domain**: The outgoing SMTP FSM uses the server's configured domain in the EHLO greeting (not `localhost`), which is required for compatibility with Gmail, Microsoft 365, and other professional SMTP servers.
- **Dot-stuffing**: The DATA phase properly dot-stuffs lines beginning with `.` per RFC 5321 §4.5.2.
- **Sent email tracking**: The sender's local copy is stored in `sentEmailIds` (separate from `emailIds` which tracks received mail). This allows the client to list sent emails without decrypting them on the server.

#### POST /email/publickeys
Resolve public keys for a list of email addresses. Returns keys only for local users; external addresses return `null` keys.

**Request**: `GetPublicKeysRequest`
```json
{
  "addresses": ["alice@example.com", "bob@openneutron.com"]
}
```
**Response**: `GetPublicKeysResponse`
```json
{
  "keys": [
    {
      "address": "alice@example.com",
      "public_key": null,
      "key_type": "none"
    },
    {
      "address": "bob@openneutron.com",
      "public_key": "base64-encoded-DER-public-key",
      "key_type": "none"
    }
  ]
}
```

> **`key_type`**: Always `"none"` in the current version. Reserved for future use when negotiated E2EE is implemented — possible values will include `"x25519"`, `"kyber"`, etc.
>
> **`public_key`**: Base64-encoded DER public key bytes, or `null` if the user does not exist or has no key set.

#### POST /email/sendencrypted
Send an email to one or more recipients. The server stores a local copy for the sender and delivers each recipient's payload individually.

**Request**: `SendEncryptedRequest`
```json
{
  "e2ee": false,
  "localcopy": {
    "to": ["alice@example.com", "bob@openneutron.com"],
    "timestamp": 1711540000,
    "public_key_hash": "base64-encoded-sha256-hash",
    "raw_data": "base64-encoded-email-bytes"
  },
  "recipients": {
    "alice@example.com": "base64-encoded-email-bytes",
    "bob@openneutron.com": "base64-encoded-email-bytes"
  }
}
```

> **`e2ee`**: Boolean flag. `false` means envelope encryption was not negotiated (the bytes may or may not be encrypted — the server does not inspect them). Reserved for future E2EE handshake tracking.
>
> **`localcopy`**: The sender's own copy of the email. The `from` field is **auto-filled** by the server as `<username>@<domain>`. The `raw_data` is stored as-is (the server assumes the client encrypted it for its own public key). The UID of the stored copy is returned in the response and added to the sender's `sent_emails`.
>
> **`localcopy.public_key_hash`**: Base64-encoded SHA-256 hash of the sender's public key. Stored alongside the email for client-side verification.
>
> **`recipients`**: A map of `address → base64-email-bytes`. Each entry is delivered **separately**:
>   - **Local recipients** (address domain matches the server's domain): Not currently auto-stored — delivery to local users is handled by SMTP. The bytes are DKIM-signed (if configured) and sent via SMTP to the local MX.
>   - **External recipients**: The bytes are DKIM-signed (if configured) and sent via SMTP to the recipient domain's MX server using opportunistic STARTTLS.

**Response**: `SendEncryptedResponse`
```json
{
  "message": "Send completed",
  "sent_email_uid": 12345678901234567890,
  "delivery_results": [
    {
      "address": "alice@example.com",
      "success": true,
      "error": null
    },
    {
      "address": "bob@openneutron.com",
      "success": true,
      "error": null
    }
  ]
}
```

> **`sent_email_uid`**: The UID of the stored sender copy. Use the `/email/sent/*` endpoints below to query it.
>
> **`delivery_results`**: Per-recipient delivery outcome. `success: true` means the remote SMTP server accepted the message. If `success: false`, the `error` field contains details.

---

### Sent Emails

All four endpoints are **authenticated** (Bearer token required). A sent email is the same `Email` blob stored in `EmailStorage`; its UID lives in the sender's `sent_emails` array rather than `emailIds`.

#### POST /email/sent/list
Return every sent-email UID for the authenticated user (unordered, insertion order).

**Request**: empty body `{}` or no body required.

**Response**: `EmailUidsResponse`
```json
{ "uids": [123456, 789012] }
```

---

#### POST /email/sent/recent
Return a paginated slice of sent-email UIDs, newest first.

**Request**:
```json
{ "offset": 0, "limit": 20 }
```

**Response**: `EmailUidsResponse`
```json
{ "uids": [789012, 123456] }
```

---

#### POST /email/sent/get
Retrieve a single sent email by UID.

**Request**:
```json
{ "uid": 789012 }
```

**Response**: `EmailBytesResponse`
```json
{
  "uid": 789012,
  "data": "<base64-encoded raw email bytes>",
  "received_at": "2024-01-15T10:30:00Z"
}
```

Returns **404** if the UID is not in the caller's `sent_emails`.

---

#### POST /email/sent/bulk
Retrieve multiple sent emails in one request. UIDs not owned by the caller are silently ignored.

**Request**:
```json
{ "uids": [123456, 789012] }
```

**Response**: `EmailsBulkResponse`
```json
{
  "emails": [
    { "uid": 123456, "data": "<base64>", "received_at": "2024-01-15T10:00:00Z" },
    { "uid": 789012, "data": "<base64>", "received_at": "2024-01-15T10:30:00Z" }
  ]
}
```

---

### DKIM Configuration (config.yml)

To enable DKIM signing for outgoing emails, configure the `dkim` section:

```yaml
dkim:
  enabled: true
  private_key_path: "dkim_private.pem"   # Path to RSA private key in PKCS#8 PEM format
  selector: "default"                     # DKIM selector (used in DNS: <selector>._domainkey.<domain>)
```

On startup, if `private_key_path` is set and the file exists, the server loads the key and uses it to sign all outbound SMTP messages. If the key cannot be loaded, a warning is logged and outgoing mail is sent unsigned.

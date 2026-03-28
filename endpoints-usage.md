# OpenNeutron API Endpoints Usage

This document lists all API endpoints from the server and indicates which ones are currently used in the UI codebase.

| Endpoint | Method | Used | Purpose |
|----------|--------|------|---------|
| /auth/login | POST | Yes | User authentication |
| /user/register | POST | No | User registration (not used in UI) |
| /user/me | GET | No | Get current user info (function defined but not called) |
| /me | GET | No | Alias for /user/me |
| /user/setup | POST | Yes | Set password and keys for new users |
| /admin/users | GET | Yes | List all users (admin) |
| /admin/users | POST | Yes | Create new user (admin) |
| /admin/users | DELETE | Yes | Delete user (admin) |
| /admin/users/admin | POST | Yes | Set admin status (admin) |
| /admin/users/credentials | POST | Yes | Set user credentials (admin) |
| /admin/disk-usage | GET | No | Get disk usage stats (not used) |
| /email/list | POST | Yes | List all email UIDs |
| /email/get | POST | Yes | Get single email |
| /email/set | POST | Yes | Update email data |
| /email/recent | POST | Yes | Get recent emails with pagination |
| /email/bulk | POST | Yes | Get multiple emails |
| /email/send | POST | No | Send plaintext email (not used, uses sendencrypted) |
| /email/read | POST | Yes | Mark email as read |
| /email/unread | POST | Yes | Mark email as unread |
| /email/star | POST | Yes | Star/unstar email |
| /email/delete | POST | Yes | Delete email |
| /email/publickeys | POST | Yes | Get public keys for recipients |
| /email/sendencrypted | POST | Yes | Send encrypted email |
| /email/sent/list | POST | No | List all sent email UIDs (not used, uses sent/recent) |
| /email/sent/recent | POST | Yes | Get recent sent emails |
| /email/sent/bulk | POST | Yes | Get multiple sent emails |
| /email/sent/get | POST | Yes | Get single sent email |
| /group/list | GET | Yes | List all groups |
| /group/create | POST | Yes | Create group |
| /group/get | POST | No | Get single group (not used) |
| /group/update | POST | Yes | Update group |
| /group/delete | POST | Yes | Delete group |
| /group/add-email | POST | Yes | Add email to group |
| /group/remove-email | POST | Yes | Remove email from group |

## Notes
- Unused endpoints can potentially be removed from the server to simplify the codebase.
- The UI uses encrypted sending (/email/sendencrypted) instead of plaintext (/email/send).
- Sent emails use /email/sent/recent instead of /email/sent/list.
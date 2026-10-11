# JPA Vidyalaya Matric School — Website & Admin Panel

A complete school website with an admin panel to manage all content. **No dependencies to install** — it uses only Node.js built-ins.

## Run it
Requires **Node.js 22.13 or newer**.

```bash
cd jpa-school
node --disable-warning=ExperimentalWarning server.js     # or: npm start
```

* Website: http://localhost:3000
* Admin panel: http://localhost:3000/admin
* First login: user `admin`, password `Admin@123` — **you are forced to be reminded to change it** (Admin → Change Password).
  To choose your own at first start: `ADMIN_PASSWORD='YourStrongPassword' node server.js`

## Website pages
Home · About · Management Team · Co-Curricular Activities · Events (with Notice Board) · Features · Gallery (filters + lightbox) · Contact Us (map + admission/general enquiry form). Floating WhatsApp button, mobile-friendly menu, SEO tags.

## What the admin can manage (no coding)
| Section | Controls |
|---|---|
| Dashboard | New-enquiry counts, recent enquiries, quick actions |
| Enquiries | Admission enquiries + contact messages: read, mark done, delete, export CSV |
| Hero Slides | Home page banner images, headings, buttons |
| Notices | Notice-board posts, pin important ones |
| Events | Upcoming/past events (auto-sorted by date) with photos |
| Gallery | Upload one or many photos, captions, categories |
| Management & Staff | Names, designations, photos, bios, groups |
| Co-Curricular, Features, Testimonials | Cards shown on their pages |
| School Settings | Name, logo, address, phone, email, hours, WhatsApp, admission banner on/off, welcome/about/vision/mission, counters, social links, map |
| Media Library | See, copy and delete uploaded images (in-use images are protected) |

Every item has a **Show on website** switch, so content can be hidden without deleting it.

## Data & backups
* Database: `data/school.db` (SQLite). Images: `public/uploads/`.
* **Back up both** regularly (copy the `data` and `public/uploads` folders).
* Change location with `DATA_DIR=/path node server.js`; port with `PORT=8080`.

## Going live (deployment notes)
* Run behind HTTPS (Nginx/Caddy or any host that supports Node). When on HTTPS set `SECURE_COOKIE=1`; behind a reverse proxy also set `TRUST_PROXY=1` so rate-limits see real visitor IPs.
* Keep it running with a process manager (pm2 / systemd).
* Security built in: scrypt-hashed passwords, HttpOnly SameSite sessions (8 h), login and form rate-limiting, CSRF header check, strict upload validation (real image types only), output escaping, Content-Security-Policy and other security headers, spam honeypot on forms.

## Project layout
```
server.js        HTTP server, SQLite schema, API, auth
seed.js          starter content (runs once, first start)
views/site.js    server-rendered public pages
public/css,js    website styles/scripts
public/admin/    admin panel (single-page app)
public/uploads/  logo, photos, uploaded images
data/            SQLite database (created on first run)
```

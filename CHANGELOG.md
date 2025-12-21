# Changelog

## [1.1.0] - Algeria Centers Update

### Changed
- Updated all BLS centers from Spain (Madrid, Barcelona, etc.) to Algeria centers
- **Algiers Centers**: Algiers 1, Algiers 2, Algiers 3, Algiers 4
- **Oran Centers**: Oran 1, Oran 2, Oran 3
- Updated visa categories to include all subcategories:
  - Added: Family, Medical, Cultural, Sports, Official, Diplomatic
  - Existing: Tourist, Student, Work, Business, Transit

### Updated Files
- `models/Profile.js` - Updated ENUM for centers and visa categories
- `models/Monitor.js` - Updated ENUM for centers
- `routes/profiles.js` - Updated validation for centers and visa categories
- `routes/monitor.js` - Updated validation for centers
- `services/monitorService.js` - Updated BLS URL to Algeria
- `index.html` - Updated frontend dropdowns
- `config/constants.js` - New file with center and visa category constants
- Documentation files updated

### Added
- `config/constants.js` - Centralized constants for centers and visa categories
- `config/centers-info.md` - Documentation for centers and visa categories

## [1.0.0] - Initial Release

### Features
- User authentication with JWT
- Profile management with encrypted PII
- BLS appointment monitoring
- Multi-channel notifications (Email, WhatsApp, Telegram, SMS)
- Payment processing (Stripe)
- CAPTCHA solving (2Captcha)
- Real-time updates via Socket.io
- PostgreSQL database with Sequelize ORM
- Data encryption (AES-256-GCM)


const sequelize = require('../config/database');

// Import models
const User = require('./User')(sequelize);
const Profile = require('./Profile')(sequelize);
const Monitor = require('./Monitor')(sequelize);
const Settings = require('./Settings')(sequelize);
const Slot = require('./Slot')(sequelize);

// Define associations
User.hasMany(Profile, { foreignKey: 'user_id', as: 'profiles' });
Profile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Monitor, { foreignKey: 'user_id', as: 'monitors' });
Monitor.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Profile.hasMany(Monitor, { foreignKey: 'profile_id', as: 'monitors' });
Monitor.belongsTo(Profile, { foreignKey: 'profile_id', as: 'profile' });

User.hasOne(Settings, { foreignKey: 'user_id', as: 'settings' });
Settings.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Monitor.hasMany(Slot, { foreignKey: 'monitor_id', as: 'slots' });
Slot.belongsTo(Monitor, { foreignKey: 'monitor_id', as: 'monitor' });

module.exports = {
  sequelize,
  User,
  Profile,
  Monitor,
  Settings,
  Slot
};



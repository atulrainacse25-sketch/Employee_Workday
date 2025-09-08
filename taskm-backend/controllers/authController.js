const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const AppDataSource = require('../data-source');
const User = require('../entities/User');
const dotenv = require('dotenv');
dotenv.config();

/**
 * Register a new user
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const userRepo = AppDataSource.getRepository(User);

    const existingUser = await userRepo.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = userRepo.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'user',
    });

    await userRepo.save(newUser);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err) {
    console.error('Register error:', err.stack);
    return res.status(500).json({ message: 'Server error during registration' });
  }
};


/**
 * Login user
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOneBy({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'user'
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
};

/**
 * Refresh token
 */
exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' });
    }

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, async (err, decoded) => {
      if (err) return res.status(403).json({ message: 'Invalid refresh token' });

      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOneBy({ id: decoded.id });
      if (!user) return res.status(404).json({ message: 'User not found' });

      const newToken = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.json({
        success: true,
        token: newToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role || 'user'
        }
      });
    });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ message: 'Server error during token refresh' });
  }
};

/**
 * Logout user
 */
exports.logout = async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
};

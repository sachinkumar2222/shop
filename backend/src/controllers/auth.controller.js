import * as authService from '../services/auth.service.js';

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const data = await authService.loginUser(email, password);

    res.json({
      success: true,
      message: 'Logged in successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.user.id);
    res.json({
      success: true,
      message: 'User profile fetched successfully',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

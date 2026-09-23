// utils/responseHandler.js
module.exports = {
  success: (res, status = 200, data = null, message = "") => {
    res.status(status).json({
      success: true,
      message,
      data
    });
  },
  
  error: (res, status = 500, message = "Internal server error") => {
    res.status(status).json({
      success: false,
      error: message
    });
  }
};
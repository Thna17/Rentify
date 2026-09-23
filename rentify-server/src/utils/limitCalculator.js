module.exports.calculateEffectiveLimits = (baseLimits, services, quantities) => {
  const limits = { ...baseLimits };
  
  services.forEach(serviceId => {
    const quantity = quantities[serviceId] || 1;
    
    switch(serviceId) {
      case "extra-staff":
        limits.staff = (parseInt(limits.staff) || 0) + quantity;
        break;
      case "extra-storage":
        limits.storage = `${(parseInt(limits.storage) || 0) + quantity * 1024} MB`;
        break;
      // Add other services
    }
  });
  
  return limits;
};
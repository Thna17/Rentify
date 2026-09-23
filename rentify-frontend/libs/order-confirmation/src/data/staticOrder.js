export const staticOrder = {
    id: 'DEMO_ORDER_123',
    status: 'completed',
    paymentMethod: 'COD',
    totalAmount: 114.97,
    createdAt: new Date().toISOString(),
    OrderItems: [
      {
        id: 1,
        quantity: 1,
        price: 29.99,
        Product: {
          id: 1,
          name: 'Hydrating Moisturizer',
          price: 29.99,
          image: 'https://www.thelifestyle-files.com/wp-content/uploads/2019/03/skincare-product-works1-800x1142.jpg',
          sku: 'DEMO_SKU_1'
        }
      },
      {
        id: 2,
        quantity: 1,
        price: 49.99,
        Product: {
          id: 2,
          name: 'Vitamin C Serum',
          price: 49.99,
          image: 'https://m.media-amazon.com/images/I/61l7AJ+0zcL._SL1500_.jpg',
          sku: 'DEMO_SKU_2'
        }
      },
      {
        id: 3,
        quantity: 1,
        price: 34.99,
        Product: {
          id: 3,
          name: 'Sunscreen SPF 50',
          price: 34.99,
          image: 'https://joypersonalcare.com/cdn/shop/files/AlldayactiveultramattedrytouchsunscreenwithSPF50PA_F.jpg?v=1704269148',
          sku: 'DEMO_SKU_3'
        }
      }
    ],
    shippingAddress: JSON.stringify({
      name: 'John Doe',
      phone: '(555) 555-1234',
      street: '123 Demo Street',
      district: 'Demo District',
      province: 'Demo Province'
    })
  };
  
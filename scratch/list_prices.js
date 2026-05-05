import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function listPrices() {
  try {
    const prices = await stripe.prices.list({
      expand: ['data.product'],
    });

    console.log('--- STRIPE PRICES ---');
    prices.data.forEach((price) => {
      console.log(`Product: ${price.product.name} (${price.product.id})`);
      console.log(`Price ID: ${price.id}`);
      console.log(`Amount: ${price.unit_amount / 100} ${price.currency.toUpperCase()}`);
      console.log('----------------------');
    });
  } catch (error) {
    console.error('Error listing prices:', error.message);
  }
}

listPrices();

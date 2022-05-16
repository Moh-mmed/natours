/*eslint-disable */
import axios from 'axios'
import {showAlert} from './alerts'
const stripe = Stripe(
  'pk_test_51IZxFLCGzEN7AevDDriCJoBclV3QCrD94MNv0NUqOFAns5e4amv4LOBH36aAJc6IYFsAeQRO53Gm6V94sCX2Ojnl00VFTzkPkW'
);

export const bookTour = async tourId => {
    try {
        //* 1) Get Checkout session from API
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);

    //* 2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });

    } catch (err) {
        console.log(err)
        showAlert('error', err)
  }
}

const axios = require("axios");

class PaymentVerificationService {
    /**
     * Check transaction status with Bakong
     * @param {string} md5Hash - The MD5 hash of the KHQR transaction
     * @param {number} expectedAmount - The expected amount to match
     * @returns {Promise<object|null>} - Returns verification data if success, null otherwise
     */
    async verifyBakongTransaction(md5Hash, expectedAmount) {
        try {
            const response = await axios.post(
                `https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5`,
                { md5: md5Hash },
                { headers: { Authorization: `Bearer ${process.env.BAKONG_API_KEY}` } }
            );

            const { responseMessage, responseCode, data } = response.data;

            if (
                responseMessage === "Success" &&
                responseCode === 0 &&
                data &&
                parseFloat(data.amount) === parseFloat(expectedAmount)
            ) {
                return {
                    transactionId: data.transactionId,
                    senderAccount: data.senderAccount,
                    amount: data.amount,
                    currency: data.currency,
                    verifiedAt: new Date(),
                };
            }

            return null;
        } catch (error) {
            console.error("Bakong verification error:", error.message);
            return null;
        }
    }
}

module.exports = new PaymentVerificationService();

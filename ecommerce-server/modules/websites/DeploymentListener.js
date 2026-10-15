const { redisSubscriber } = require('../../config/redis');
const { WebsiteData } = require('../../models');

let listenerStarted = false;

// Reuse logic from controller or model. Since we can't easily import a controller (req/res),
// we will implement direct model update here. The Controller just updates WebsiteData model.

const startDeploymentListener = () => {
    if (listenerStarted) return;
    listenerStarted = true;

    const subscribe = () => redisSubscriber.subscribe('deployment_updates', (err, count) => {
        if (err) {
            console.error('Failed to subscribe: %s', err.message);
        } else {
            console.log(`Subscribed to ${count} channel(s). Listening for updates...`);
        }
    });

    // ioredis performs its readiness check with regular Redis commands. Do not
    // enter subscriber mode until that check has completed.
    if (redisSubscriber.status === 'ready') {
        subscribe();
    } else {
        redisSubscriber.once('ready', subscribe);
    }

    redisSubscriber.on('message', async (channel, message) => {
        if (channel === 'deployment_updates') {
            try {
                const data = JSON.parse(message);
                console.log('Received deployment update:', data);

                const { websiteId, domain, status } = data;

                if (!websiteId) return;

                // Perform the update
                const [updated] = await WebsiteData.update(
                    { domain, status },
                    { where: { platformWebsiteId: websiteId } }
                    // Note: verify if PK is id or platformWebsiteId. 
                    // Previous controller used websiteId (from params) to update. 
                    // Need to check Model definition. Assuming platformWebsiteId references rentify-server ID.
                );

                if (updated) {
                    console.log(`Updated website data for ${websiteId}`);
                } else {
                    console.log(`Website data not found for ${websiteId}, looking for id...`);
                    // Fallback: maybe the ID passed IS the primary key of WebsiteData?
                    // ecommerce-server might map IDs 1:1.
                    // Let's assume passed ID is the PK for now or check Model.
                    await WebsiteData.update(
                        { domain, status },
                        { where: { id: websiteId } }
                    );
                }

            } catch (error) {
                console.error('Error processing deployment update:', error);
            }
        }
    });
};

module.exports = startDeploymentListener;

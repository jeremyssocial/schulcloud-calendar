const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const cors = require('cors');
const config = require('../config');
const corsOptions = {
	origin: config.CORS_ORIGIN
};
router.use(cors(corsOptions));
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

// authentication, authorization and preprocessing
const { authenticateFromHeaderField } = require('../security/authentication');
const { authorizeAccessToScopeId, authorizeAccessToObjects, authorizeWithPotentialScopeIds } = require('../security/authorization');
const jsonApiToJson = require('../parsers/subscription/jsonApiToJson');

// response
const returnSuccess = require('../utils/response/returnSuccess');
const subscriptionsToJsonApi = require('../parsers/subscription/subscriptionsToJsonApi');

// content
const getSubscriptions = require('../services/subscriptions/getSubscriptions');
const getOriginalSubscription = require('../queries/subscriptions/getOriginalSubscription');
const insertSubscriptions = require('../services/subscriptions/insertSubscriptions');
const updateSubscriptions = require('../services/subscriptions/updateSubscriptions');
const deleteSubscriptions = require('../services/subscriptions/deleteSubscriptions');

/* routes */

router.get('/subscriptions', authenticateFromHeaderField, function (req, res, next) {
	const scopeId = req.query['scope-id'];
	const subscriptionId = req.query['subscription-id'];
	const lastUpdateFailed = req.query['last-update-failed'];
	const filter = { scopeId, subscriptionId, lastUpdateFailed };
	const user = req.user;

	authorizeAccessToScopeId(user, filter.scopeId)
		.then(() => getSubscriptions(filter, user.scopes))
		.then((subscriptions) => authorizeAccessToObjects(user, 'can-read', subscriptions))
		.then(subscriptionsToJsonApi)
		.then((jsonApi) => { returnSuccess(res, 200, jsonApi); })
		.catch(next);
});

router.post('/subscriptions', jsonApiToJson, authenticateFromHeaderField, function (req, res, next) {
	const user = req.user;
	const subscriptions = req.subscriptions;

	authorizeAccessToObjects(user, 'can-write', subscriptions)
		.then(insertSubscriptions)
		.then(subscriptionsToJsonApi)
		.then((jsonApi) => { returnSuccess(res, 200, jsonApi); })
		.catch(next);
});

router.put('/subscriptions/:subscriptionId', jsonApiToJson, authenticateFromHeaderField, function (req, res, next) {
	const subscriptionId = req.params.subscriptionId;
	const subscription = req.subscriptions[0];
	const scopeIds = subscription.scope_ids;
	const user = req.user;

	authorizeWithPotentialScopeIds(subscriptionId, scopeIds, user, getSubscriptions, getOriginalSubscription, 'subscriptionId')
		.then(() => updateSubscriptions(subscription, subscriptionId))
		.then((updatedSubscriptions) => {
			if (updatedSubscriptions.length === 0) {
				const error = 'Given subscriptionId or scopeIds not found';
				const status = 404;
				const title = 'Query Error';
				return Promise.reject({error, status, title});
			} else {
				return updatedSubscriptions;
			}
		})
		.then(subscriptionsToJsonApi)
		.then((jsonApi) => { returnSuccess(res, 200, jsonApi); })
		.catch(next);
});

router.delete('/subscriptions/:subscriptionId', jsonApiToJson, authenticateFromHeaderField, function (req, res, next) {
	const subscriptionId = req.params.subscriptionId;
	const subscription = req.subscriptions[0];
	const scopeIds = subscription.scope_ids;
	const user = req.user;

	authorizeWithPotentialScopeIds(subscriptionId, scopeIds, user, getSubscriptions, getOriginalSubscription, 'subscriptionId')
		.then(() => deleteSubscriptions(subscriptionId, scopeIds))
		.then((deletedSubscriptions) => {
			if (deletedSubscriptions.length === 0) {
				const err = {
					message: 'Given subscriptionId or scopeIds not found',
					status: 404,
					title: 'Query Error',
				}
				next(err);
			} else {
				return deletedSubscriptions;
			}
		})
		.catch(next);
});

module.exports = router;

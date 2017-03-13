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

// preprocessing
const authorize = require('../infrastructure/authorization');
const jsonApiToJson = require('../parsers/event/jsonApiToJson');
const icsToJson = require('../parsers/event/icsToJson');

// response
const returnError = require('../utils/response/returnError');
const returnSuccess = require('../utils/response/returnSuccess');
const sendNotification = require('../services/sendNotification');
const eventsToJsonApi = require('../parsers/event/eventsToJsonApi');
const eventsToIcsInJsonApi = require('../parsers/event/eventsToIcsInJsonApi');

// content
const getEvents = require('../services/events/getEvents');
const storeEvents = require('../services/events/storeEvents');
const deleteEvents = require('../services/events/deleteEvents');

/* routes */

router.get('/events', authorize, function (req, res) {
    const filter = {
        scopeId: req.query['scope-id'],
        eventId: req.query['event-id'],
        from: req.query['from'],
        until: req.query['until'],
        all: req.query['all']
    };
    const token = req.get('Authorization');
    getEvents(filter, token)
        .then(eventsToJsonApi)
        .then((jsonApi) => { returnSuccess(res, 200, jsonApi); })
        .catch(({error, status, title}) => {
            returnError(res, error, status, title);
        });
});

router.post('/events', jsonApiToJson, authorize, function (req, res) {
    const events = req.events;
    const user = req.user.id;
    insertEvents(events, user)
        .then(sendInsertNotification)
        .then(eventsToJsonApi)
        .then((jsonApi) => { returnSuccess(res, 200, jsonApi); })
        .catch(({error, status, title}) => {
            returnError(res, error, status, title);
        });
});

router.post('/events/ics', icsToJson, authorize, function (req, res) {
    const events = req.events;
    const user = req.user.id;
    insertEvents(events, user)
        .then(sendInsertNotification)
        .then(eventsToIcsInJsonApi)
        .then((jsonApi) => { returnSuccess(res, 200, jsonApi); })
        .catch(({error, status, title}) => {
            returnError(res, error, status, title);
        });
});

router.put('/events/:eventId', jsonApiToJson, authorize, function (req, res) {
    const eventId = req.params.eventId;
    const event = req.events;
    updateEvents(eventId, event)
        .then(sendUpdateNotification)
        .then(eventsToJsonApi)
        .then((jsonApi) => { returnSuccess(res, 200, jsonApi); })
        .catch((error) => { returnError(res, error); });
});

router.put('/events/ics/:eventId', icsToJson, authorize, function (req, res) {
    const eventId = req.params.eventId;
    const event = req.events;
    updateEvents(eventId, event)
        .then(sendUpdateNotification)
        .then(eventsToIcsInJsonApi)
        .then((jsonApi) => { returnSuccess(res, 200, jsonApi); })
        .catch(({error, status, title}) => {
            returnError(res, error, status, title);
        });
});

router.delete('/events/:eventId', authorize, function (req, res) {
    const eventId = req.params.eventId;
    // TODO parse req in beforehand and get those in a nicer way
    const scopeIds = req.body.data[0].relationships['scope-ids'];
    const separateUsers = req.body.data[0].relationships['separate-users'];
    deleteEvents(eventId, scopeIds, separateUsers)
        .then((deletedEvents) => {
            if (deletedEvents.length > 0) {
                returnSuccess(res, 204);
                deletedEvents.forEach((deletedEvent) => {
                    sendNotification.forDeletedEvent(
                        deletedEvent['scope_id'],
                        deletedEvent['summary'],
                        deletedEvent['dtstart'],
                        deletedEvent['dtend']
                    );
                });
            } else {
                const error = 'Given eventId or scopeIds not found';
                const status = 404;
                const title = 'Query Error';
                returnError(res, error, status, title);
            }
        })
        .catch(({error, status, title}) => {
            returnError(res, error, status, title);
        });
});

function insertEvents(events, user) {
    return new Promise(function (resolve, reject) {
        storeEvents(events, user)
            .then(resolve)
            .catch(reject);
    });
}

function sendInsertNotification(insertedEvents) {
    insertedEvents.forEach((insertedEvent) => {
        const {scope_id, summary, dtstart, dtend} = insertedEvent;
        sendNotification.forNewEvent(scope_id, summary, dtstart, dtend);
    });
    return insertedEvents;
}

function updateEvents(eventId, event) {
    return new Promise(function (resolve, reject) {
        deleteEvents(eventId)
            .then((deletedEvent) => {
                if (deletedEvent) {
                    return insertEvents(event);
                } else {
                    const error = 'Given eventId not found';
                    const status = 404;
                    const title = 'Query Error';
                    reject({error, status, title});
                }
            })
            .then(resolve)
            .catch(reject);
    });
}

function sendUpdateNotification(updatedEvents) {
    updatedEvents.forEach((updatedEvent) => {
        const { scope_id, summary, dtstart, dtend } = updatedEvent;
        sendNotification.forModifiedEvent(scope_id, summary, dtstart, dtend);
    });
    return updatedEvents;
}

module.exports = router;

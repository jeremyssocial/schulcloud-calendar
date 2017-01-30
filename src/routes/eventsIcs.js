// Services
const createAndSendNotification = require('../services/notifications/createAndSendNotification');
const storeEventsInDb = require('../services/events/storeEventsInDb');

// Utilities
const returnSuccessWithoutContent = require('./utils/returnSuccessWithoutContent');
const returnError = require('./utils/returnError');
const consoleError = require('../utils/consoleError');
const handleDeleteRequest = require("./utils/handleDeleteRequest");

// Parsers
const icsToJson = require('../parsers/icsToJson');

// Queries
const addAlarmToEvent = require('../queries/addAlarmToEvent');
const deleteEvent = require('../queries/deleteEvent');

// HTTP Requests
const newNotificationForScopeIds = require('../http-requests/newNotificationForScopeIds');

// Authorization
const authorize = require("../authorization/index");

// Request Handlers
const handleJsonPUTRequest = require('./request-handlers/handleJsonPUTRequest');
const handleJsonPOSTRequest = require('./request-handlers/handleJsonPOSTRequest');

// Project Configuration
const config = require('../config');

// Imports
const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();

// Configuration
const cors = require('cors');
let corsOptions = {
    origin: config.CORS_ORIGIN
};
router.use(cors(corsOptions));
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

//Routes

router.post('/', authorize, icsToJson, function (req, res) {
    handleJsonPOSTRequest(req, res);
});

router.put('/:eventId', authorize, icsToJson, function (req, res) {
    handleJsonPUTRequest(req, res);
});

module.exports = router;

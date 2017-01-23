const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();

const cors = require('cors');
let corsOptions = {
    origin: 'https://schulcloud.github.io'
};
router.use(cors(corsOptions));

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({extended: false}));

const handleError = require('./utils/handleError');
const authorize = require("../authorization/index");

router.options('/:toDoId', cors(corsOptions));

// POST /to-dos/ics
router.post('/', authorize, function (req, res) {
    // TODO: implement
    handleError(res);
});

// PUT /to-dos/ics/:toDoId
router.put('/:toDoId', authorize, function (req, res) {
    // TODO: implement
    handleError(res);
});

module.exports = router;
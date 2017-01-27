const selectEvents = require('../../queries/selectEvents');
const allAlarmsForEvent = require('../../queries/allAlarmsForEvent').allAlarmsForEvent;
const getRepeatExceptionForEvent = require('../../queries/getRepeatExceptionForEvent').getRepeatExceptionForEvent;

function getEvents(filter) {
    return new Promise((resolve, reject) => {
        selectEvents(filter)
            .then(appendAlarms)
            .then(appendExdates)
            .then(resolve)
            .catch((error) => { reject(error) })
    });
}

function appendAlarms(events) {
    return new Promise((resolve, reject) => {
        events.forEach((event, index) => {
            allAlarmsForEvent(event["id"])
                .then((alarms) => {
                    console.log(alarms);
                    event.alarms = alarms;
                    if (index === events.length - 1) resolve(events)
                })
                .catch((error) => { reject(error) })
        });
    });
}

function appendExdates(events) {
    return new Promise((resolve, reject) => {
        events.forEach((event, index) => {
            getRepeatExceptionForEvent(event["id"])
                .then((exdates) => {
                    console.log(exdates);
                    event.exdates = exdates;
                    if (index === events.length - 1) resolve(events)
                })
                .catch((error) => { reject(error) })
        });
    });
}

module.exports = getEvents;

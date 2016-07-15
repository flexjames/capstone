'use strict';
var router = require('express').Router();
module.exports = router;
router.use('/members', require('./members'));
router.use('/projects', require('./projects'));
router.use('/users', require('./users'));
router.use('/data', require('./data'));
router.use('/manifests', require('./manifests'));
router.use('/generator', require('./generator'));

// Make sure this is after all of
// the registered routes!
router.use(function (req, res) {
    res.status(404).end();
});

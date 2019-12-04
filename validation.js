const { check } = require('express-validator');
const config = require('./config');

const checkQuestion = [
    check('title').exists().isString().isLength({ max: 400 }),
    check('detail').isLength({ max: 1000 }),
    check('answers').exists().isLength({ min: 1, max: config.MAX_ITEM_COUNT }),
    check('answers.*').exists().isString().isLength({ max: 100 }),
    check('answer_type').exists().isIn(['radio', 'checkbox']),
    check('hashtags').isLength({ max: 200 }),
    check('period_hours').exists().isIn(['-1', '6', '12', '24', '48', '72', '168']),
    check('publish_status').exists().isIn(['1', '2'])
];

module.exports = {
  checkQuestion: checkQuestion
};

const { check } = require('express-validator');
const config = require('./config');
const models = require('./models/model-datastore');

const checkQuestion = [
    check('title').exists().isString().isLength({ max: 100 }),
    check('detail').isLength({ max: 400 }),
    check('answers').exists().isLength({ min: 1, max: config.MAX_ITEM_COUNT }),
    check('answers.*').exists().isString().isLength({ max: 40 }),
    check('answer_type').exists().isIn(['radio', 'checkbox']),
    check('hashtags').isLength({ max: 100 }),
    check('period_hours').exists().isIn(['6', '12', '24', '48', '72']),
    check('publish_status').exists().isIn(['1', '2'])
];

const checkQuestionModification = [
    check('title').exists().isString().isLength({ max: 100 }),
    check('detail').isLength({ max: 400 }),
    check('answer_type').exists().isIn(['radio', 'checkbox']),
    check('hashtags').isLength({ max: 100 }),
    check('period_hours').exists().isIn(['0', '6', '12', '24', '48', '72']),
    check('publish_status').exists().isIn(['1', '2'])
];

module.exports = {
  checkQuestion: checkQuestion,
  checkQuestionModification: checkQuestionModification,
};

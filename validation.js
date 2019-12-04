const { check } = require('express-validator');

export const check_question = [
    check('title').exists().isString().isLength({ max: 400 }),
    check('detail').isLength({ max: 1000 }),
    check('answers').exists().isLength({ min: 1, max: 10 }),
    check('answers.*').exists().isString().isLength({ max: 100 }),
    check('answer_type').exists().isIn(['radio', 'checkbox']),
    check('hashtags').isLength({ max: 200 }),
    check('period_hours').exists().isIn(['-1', '6', '12', '24', '48', '72', '168']),
    check('publish_status').exists().isIn(['1', '2'])
];

// Copyright 2017, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

const express = require('express');
const images = require('../lib/images');
const oauth2 = require('../lib/oauth2');
const models = require('../models/model-datastore');
const { check, validationResult } = require('express-validator');

const router = express.Router();

// Use the oauth middleware to automatically get the user's profile
// information and expose login/logout URLs to templates.
router.use(oauth2.template);

// Set Content-Type for all responses for these routes
router.use((req, res, next) => {
  res.set('Content-Type', 'text/html');
  next();
});

/**
 * GET /questions
 *
 * Display a page of questions (up to ten at a time).
 */
router.get('/', (req, res, next) => {
  console.log('Time:', Date.now());

  console.log("starting group_by_question_id");
  models.votes.latest(req.query.pageToken, (err, entities) => {
    if (err) {
      console.log("error occurs on getting latest votes");
      next(err);
      return;
    }
    console.log('votes.length:', entities.length);
    const votes = entities.reduce((acc, cur) => {
      const obj = acc.find(e => e.question_id === cur.question_id);
      if (obj === undefined) acc.push({question_id: cur.question_id, count: 1});
      else acc.find(e => e.question_id === cur.question_id).count++;
      return acc;
    }, []).sort((a, b) => {return a.count - b.count;});

    models.questions.read(votes.map(vote => vote.question_id), (err, entities) => {
      if (err) {
        next(err);
        return;
      }
      console.log('topics:', entities);
      const topics = entities;

      models.questions.list(10, req.query.pageToken, (err, entities, cursor) => {
        if (err) {
          next(err);
          return;
        }
        console.log('news:', entities);
        const news = entities;
        const news_cursor = cursor;

        return res.render('enquetes/list.pug', {
          topics: topics,
          news: news,
          news_cursor: news_cursor,
        });
      });
    });
  });
});

// Use the oauth2.required middleware to ensure that only logged-in users
// can access this handler.
router.get('/mine', oauth2.required, (req, res, next) => {
  models.questions.listBy(
    req.user.id,
    10,
    req.query.pageToken,
    (err, entities, cursor) => {
      if (err) {
        next(err);
        return;
      }
      res.render('enquetes/list.pug', {
        questions: entities,
        nextPageToken: cursor,
      });
    }
  );
});

/**
 * GET /enquetes/add
 *
 * Display a form for creating a question.
 */
router.get('/add', (req, res) => {
  const passedVariable = req.session.question != undefined ? req.session.question : {};
  console.log('passedVariable:',passedVariable)
  req.session.question = null;
  res.render('enquetes/form.pug', {
    question: passedVariable,
    action: 'アンケートの作成',
  });
});

/**
 * POST /enquetes/add
 *
 * Create a question.
 */
// [START add]

// TODO: validationを別ファイルに追い出す
router.post('/add',
  [
    check('title').exists().isString().isLength({ max: 400 }),
    check('detail').isLength({ max: 1000 }),
    check('answers').exists().isLength({ min: 1, max: 10 }),
    check('answers.*').exists().isString().isLength({ max: 100 }),
    check('answer_type').exists().isIn(['radio', 'check']),
    check('hashtags').isLength({ max: 200 }),
    check('period_hours').exists().isIn(['-1', '6', '12', '24', '48', '72', '168']),
    check('publish_status').exists().isIn(['1', '2'])
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('errors:', errors);
      req.session.question = req.body;
      res.redirect(`${req.baseUrl}/add`);
      return;
    }
    const question = {
      title: req.body.title,
      detail: req.body.detail,
      answer_type: req.body.answer_type,
      period_hours: req.body.period_hours,
      publish_status: req.body.publish_status,
      published_at: Date.now()
    };

    // If the user is logged in, set them as the creator of the question.
    if (req.user) {
      question.user_id = req.user.id;
    } else {
      question.user_id = 0;
    }

    if(req.body.is_confirmed === "1"){
      // Save the data to the databasquestione.
      models.questions.create(question, (err, savedData) => {
        if (err) {
          next(err);
          return;
        }
        const answers = req.body.answers.map((answer) => {
          return {content: answer, question_id: savedData.id};
        });
        res.redirect(`${req.baseUrl}/${savedData.id}`);
      });
    }else{
      console.log('validation has passed');
      req.session.question = req.body;
      res.redirect(`${req.baseUrl}/confirm`);
    }
  }
);
// [END add]

/**
 * GET /enquetes/:id/edit
 *
 * Display a question for editing.
 */
router.get('/:question/edit', (req, res, next) => {
  models.questions.read(req.params.question, (err, entity) => {
    if (err) {
      next(err);
      return;
    }
    res.render('questions/form.pug', {
      question: entity,
      action: 'Edit',
    });
  });
});

/**
 * POST /questions/:id/edit
 *
 * Update a question.
 */
router.post(
  '/:question/edit',
  images.multer.single('image'),
  images.sendUploadToGCS,
  (req, res, next) => {
    const data = req.body;

    // Was an image uploaded? If so, we'll use its public URL
    // in cloud storage.
    if (req.file && req.file.cloudStoragePublicUrl) {
      req.body.imageUrl = req.file.cloudStoragePublicUrl;
    }

    models.questions.update(req.params.question, data, (err, savedData) => {
      if (err) {
        next(err);
        return;
      }
      res.redirect(`${req.baseUrl}/${savedData.id}`);
    });
  }
);

router.get('/confirm', (req, res, next) => {
  const passedVariable = req.session.question != undefined ? req.session.question : {};
  if(passedVariable === undefined){
    next(err);
    return;
  }
  res.render('enquetes/confirm.pug', {
    question: passedVariable
  });
});

/**
 * GET /questions/:id
 *
 * Display a question.
 */
router.get('/:question', (req, res, next) => {
  models.questions.read(req.params.question, (err, entity) => {
    if (err) {
      next(err);
      return;
    }
    res.render('enquetes/view.pug', {
      question: entity,
    });
  });
});

/**
 * GET /questions/:id/delete
 *
 * Delete a question.
 */
router.get('/:question/delete', (req, res, next) => {
  models.questions.delete(req.params.question, err => {
    if (err) {
      next(err);
      return;
    }
    res.redirect(req.baseUrl);
  });
});

/**
 * Errors on "/questions/*" routes.
 */
router.use((err, req, res, next) => {
  // Format error and forward to generic error handler for logging and
  // responding to the request
  err.response = err.message;
  next(err);
});

module.exports = router;

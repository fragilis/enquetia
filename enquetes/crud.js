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
const { validationResult } = require('express-validator');
const validation = require('../validation');
const config = require('../config');

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
  models.votes.latest(req.query.pageToken, (err, entities) => {
    if (err) {
      req.flash('error', 'アンケートの取得に失敗しました。');
      return next('route');
    }
    const votes = entities.reduce((acc, cur) => {
      const obj = acc.find(e => e.question_id === cur.question_id);
      if (obj === undefined) acc.push({question_id: cur.question_id, count: 1});
      else acc.find(e => e.question_id === cur.question_id).count++;
      return acc;
    }, []).sort((a, b) => {return a.count - b.count;});

    models.questions.read(votes.map(vote => vote.question_id), (err, entities) => {
      if (err) {
        req.flash('error', 'アンケートの取得に失敗しました。');
        return next('route');
      }
      const topics = entities;

      models.questions.list(10, req.query.pageToken, (err, entities, cursor) => {
        if (err) {
          req.flash('error', 'アンケートの取得に失敗しました。');
          return next('route');
        }
        const news = entities.filter( e => {
          const deadline = e.period_hours === -1 ? null : (new Date(e.published_at.getTime())).setHours(e.published_at.getHours() + e.period_hours);
          return deadline === null || deadline > Date.now();
        });
        const newsCursor = cursor;

        return res.render('enquetes/list.pug', {
          topics: topics,
          news: news,
          newsCursor: newsCursor,
        });
      });
    });
  });
});

router.get('/', (req, res, next) => {
  return res.render('enquetes/list.pug');
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
  req.session.question = null;
  passedVariable.MAX_ITEM_COUNT = config.get('MAX_ITEM_COUNT');
  console.log('passedVariable:',passedVariable)
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

router.post('/add', validation.checkQuestion,
  (req, res, next) => {
    console.log('req.body: ', req.body)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('errors:', errors);
      req.session.question = req.body;
      res.redirect(`${req.baseUrl}/add`);
      return;
    }
    if(req.body.is_confirmed === "1" && req.body.create !== undefined){
      const question = {
        title: req.body.title,
        description: req.body.description,
        answer_type: req.body.answer_type,
        period_hours: parseInt(req.body.period_hours, 10),
        count: 0,
        publish_status: parseInt(req.body.publish_status, 10),
        published_at: new Date()
      };

      const answers = req.body.answers.map(answer => {
        const entity = {
          content: answer,
          count: 0
        };
        return entity;
      });

      // If the user is logged in, set them as the creator of the question.
      if (req.user) {
        question.user_id = req.user.id;
      } else {
        question.user_id = 0;
      }

      // Save the data to the database questions.
      models.questions.create(question, answers, (err, savedData) => {
        req.session.question = null;
        if (err) {
          req.flash('error', 'アンケートが作成できませんでした。時間を空けて再度お試しください。');
          console.log('err: ', err);
          next(err);
          return;
        }
        req.flash('info', 'アンケートが作成されました。');
        if (req.user) {
          res.redirect(`${req.baseUrl}/mine`);
        } else {
          res.redirect(`${req.baseUrl}`);
        }
      });
    }else{
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
  //req.session.question = null;
  if(passedVariable === undefined){
    next(err);
    return;
  }

  if(!req.session.profile) req.flash('warn', '現在ログインしていません。この状態で作成されたアンケートは変更・削除できなくなります。');

  res.render('enquetes/confirm.pug', {
    question: passedVariable
  });
});

/**
 * GET /:id
 *
 * Display a question.
 */
router.get('/:question_id', (req, res, next) => {
  models.questions.findById(req.params.question_id, (err, question) => {
    if (err) {
      console.log('failed to find question at crud.get(). err: ', err);
      next(err);
      return;
    }
    const published_at = new Date(question.published_at.getTime());
    const expired_at = published_at.setHours(published_at.getHours() + question.period_hours);
    const current = Date.now();
    const is_expired = expired_at < current ? true : false;
    const is_voted = req.cookies[req.params.question] != null;
    question.expired_at = expired_at;
    question.left_hours = (expired_at - current)/1000/60/60;
    question.is_expired = is_expired;
    question.is_voted = is_voted;

    res.render('enquetes/view.pug', {
      question: question,
    });
  });
});

/**
 * POST /questions/:id
 *
 * Vote to a question.
 */
router.post('/:question', (req, res, next) => {
  console.log('req.body: ', req.body)

  const answer_ids = req.body.answer instanceof Array ?
    req.body.answer.map(a => parseInt(a, 10)) :
    [parseInt(req.body.answer, 10)];
  const vote = {
    question_id: parseInt(req.body.question_id, 10),
    answer_ids: answer_ids,
    finger_print: '',
    created_at: new Date()
  };

  // Save the data to the database votes.
  models.votes.create(vote, (err, savedData) => {
    if (err) {
      console.log('err: ', err);
      res.redirect(`${req.baseUrl}/${req.url}`);
      return;
    }
    const expired_at = new Date(parseInt(req.body.question_id, 10));
    res.cookie(req.body.question_id, '1', {expires: expired_at, httpOnly: true, sameSite: 'Lax'});
    if (req.user) {
      res.redirect(`${req.baseUrl}/mine`);
    } else {
      res.redirect(`${req.baseUrl}`);
    }
  });
});

/**
 * GET /questions/:id/result
 *
 * Display a result.
 */
router.get('/:question/result', (req, res, next) => {
  models.questions.findById(req.params.question, (err, question) => {
    if (err) {
      console.log('failed to find question. err: ', err);
      next(err);
      return;
    }
    res.render('enquetes/result.pug', {
      question: question,
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

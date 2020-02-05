'use strict';

const express = require('express');
const images = require('../../lib/images');
const models = require('../../models/model-datastore');
const { validationResult } = require('express-validator');
const validation = require('../../validation');
const config = require('../../config');
const services = require('../../services/enquetes');
const router = express.Router();
const bodyParser = require('body-parser');
const csurf = require('csurf');

// setup route middlewares
const csrfProtection = csurf({ cookie: true });
const parseForm = bodyParser.urlencoded({ extended: false });

// Set Content-Type for all responses for these routes
router.use((req, res, next) => {
  res.set('Content-Type', 'text/html');
  next();
});



/**
 * GET /
 *
 * 人気のアンケートと最新アンケートを一覧表示
 */
router.get('/', (req, res, next) => {
  // 人気のアンケートを取得
  models.questions.popular(req.query.pageToken, (err, topics) => {
    if (err) {
      req.flash('error', 'アンケートの取得に失敗しました。');
      return next('route');
    }
    // 最新アンケートを取得
    models.questions.latest(10, req.query.pageToken, (err, news, newsCursor) => {
      if (err) {
        req.flash('error', 'アンケートの取得に失敗しました。');
        return next('route');
      }
      return res.render('enquetes/list.pug', {
        topics: topics,
        news: news,
        newsCursor: newsCursor,
      });
    });
  });
});

// indexページでエラーが発生したとき用のルーティング
router.get('/', (req, res, next) => {
  return res.render('enquetes/list.pug');
});


/**
 * GET /enquetes/add
 *
 * アンケート作成フォームを表示
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
 * POST /add
 *
 * バリデーションチェックをして確認画面にリダイレクト
 */
router.post('/add', validation.checkQuestion,
  (req, res, next) => {
    req.session.question = null;

    // validationエラーを処理
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.session.question = req.body;
      res.redirect(`${req.baseUrl}/add`);
    }

    // 確認画面にリダイレクト
    req.session.question = req.body;
    res.redirect(`${req.baseUrl}/confirm`);
  }
);


/**
 * GET /confirm
 *
 * 入力内容確認画面を表示
 */
router.get('/confirm', csrfProtection, (req, res, next) => {
  const passedVariable = req.session.question != undefined ? req.session.question : {};
  if(passedVariable === undefined){
    req.flash('error', 'アンケートが作成できませんでした。時間を空けて再度お試しください。');
    req.session.question = req.body;
    res.redirect(`${req.baseUrl}/confirm`);
  }

  if(!req.session.profile) req.flash('warn', '現在ログインしていません。この状態で作成したアンケートは後で変更・削除できません。');

  res.render('enquetes/confirm.pug', {
    question: passedVariable,
    csrfToken: req.csrfToken()
  });
});


/**
 * POST /confirm
 *
 * バリデーションチェック（2回目）をして今度こそ登録
 */
router.post('/confirm', validation.checkQuestion, parseForm, csrfProtection,
  (req, res, next) => {
    req.session.question = null;

    // validationエラーを処理
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.session.question = req.body;
      res.redirect(`${req.baseUrl}/add`);
    }

    // formの値をquestionとanswersに格納
    const [question, answers] = services.setEnqueteValues(req.body, req.user);

    // アンケートをDBに保存
    models.questions.create(question, answers, (err, savedData) => {
      if (err) {
        req.flash('error', 'アンケートが作成できませんでした。時間を空けて再度お試しください。');
        console.log('err: ', err);
        req.session.question = req.body;
        res.redirect(`${req.baseUrl}/confirm`);
      }
      req.flash('info', 'アンケートが作成されました。');
      if (req.user) {
        res.redirect(`${req.baseUrl}/mypage`);
      } else {
        res.redirect(`${req.baseUrl}/`);
      }
    });
  }
);


/**
 * GET /:question_id
 *
 * アンケート投票画面を表示
 */
router.get('/:question_id', (req, res, next) => {
  models.questions.findById(req.params.question_id, (err, question) => {
    if (err) {
      req.flash('error', 'アンケートの取得に失敗しました。');
      res.render('enquetes/view.pug');
    }
    const questionWithConditions = services.setConditions(question, req.cookies[req.params.question]);

    res.render('enquetes/view.pug', {
      question: questionWithConditions,
    });
  });
});


/**
 * POST /:question_id
 *
 * アンケートに投票
 */
router.post('/:question_id', (req, res, next) => {
  const vote = services.setVoteValues(req.body);

  // 投票結果をDBに保存
  models.votes.create(vote, (err, savedData) => {
    if (err) {
      console.log('err: ', err);
      req.flash('error', '投票に失敗しました。時間を空けて再度お試しください。');
      res.redirect(`${req.baseUrl}/${req.url}`);
    }
    const expired_at = new Date(parseInt(req.body.question_id, 10));
    res.cookie(req.body.question_id, '1', {expires: expired_at, httpOnly: true, sameSite: 'Lax'});
    req.flash('info', '投票に成功しました。');
    res.redirect(`${req.baseUrl}/${req.url}/result`);
  });
});


/**
 * GET /:question_id/result
 *
 * 投票結果を表示
 */
router.get('/:question_id/result', (req, res, next) => {
  models.questions.findById(req.params.question_id, (err, question) => {
    if (err) {
      console.log('failed to find question. err: ', err);
      req.flash('error', '投票結果の取得に失敗しました。時間を空けて再度お試しください。');
    }
    res.render('enquetes/result.pug', {
      question: question,
    });
  });
});





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
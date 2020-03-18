'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const models = require('../../models/model-datastore');
const config = require('../../config');
const services = require('../../services/enquetes');

const router = express.Router();

// Automatically parse request body as JSON
router.use(bodyParser.json());

/**
 * POST /api/addToFavorite
 *
 * アンケートをお気に入りに追加
 */
router.post('/addToFavorite', async (req, res, next) => {
  try {
    if(req.user == null) throw new Error('User is not logged in.');
    if(req.body.question_id == null) throw new Error('Bad request.');

    const favoriteEntity = await models.favorites.find(req.user.id, req.body.question_id);
    if(favoriteEntity.length){
      return res.json({
        favorite: favoriteEntity,
      });
    }

    const favorite = {
      user_id: parseInt(req.user.id),
      question_id: parseInt(req.body.question_id),
    };
    const entity = await models.favorites.create(favorite);
    return res.json({
      favorite: entity,
    });
  } catch (e){
    console.log(e);
    return next();
  }
});


/**
 * POST /api/removeFromFavorite
 *
 * アンケートをお気に入りから削除
 */
router.post('/removeFromFavorite', async (req, res, next) => {
  try {
    if(req.user == null) throw new Error('User is not logged in.');
    if(req.body.question_id == null) throw new Error('Bad request.');
    const entities = await models.favorites.find(parseInt(req.user.id), parseInt(req.body.question_id));
    await models.favorites._delete(entities.map(entity => entity.id));
    return res.json({
      entity: entities,
    });
  } catch (e){
    console.log(e);
    return next();
  }
});


/**
 * POST /api/getNextTopics
 *
 * 話題のアンケートの続きを取得
 */
router.post('/getNextTopics', async (req, res, next) => {
  try {
    const perPage = config.get('ENQUETES_PER_PAGE');
    const [topics, topicsToken] = await models.questions.popular(perPage, req.body.token);

    const topicsWithConditions = [];
    for(const question of topics){
      const q = await services.setConditions(question, req.cookies[String(question.id)], req.user);
      topicsWithConditions.push(q);
    }

    return res.render('enquetes/list.pug', {
      url: '',
      topics: topicsWithConditions,
      news: null,
      topicsToken: topicsToken,
      newsToken: null,
      maxItemCount: config.get('MAX_ITEM_COUNT'),
    });
  } catch (e){
    console.log(e);
    return next();
  }
});


/**
 * POST /api/getNextNews
 *
 * 最新アンケートの続きを取得
 */
router.post('/getNextNews', async (req, res, next) => {
  try {
    const perPage = config.get('ENQUETES_PER_PAGE');
    const [news, newsToken] = await models.questions.latest(perPage, req.body.token);

    const newsWithConditions = [];
    for(const question of news){
      const q = await services.setConditions(question, req.cookies[String(question.id)], req.user);
      newsWithConditions.push(q);
    }

    return res.render('enquetes/list.pug', {
      url: '',
      topics: null,
      news: newsWithConditions,
      topicsToken: false,
      newsToken: newsToken,
      maxItemCount: config.get('MAX_ITEM_COUNT'),
    });
  } catch (e){
    console.log(e);
    return next();
  }
});


/**
 * POST /api/getNextEnquetes
 *
 * マイアンケートの続きを取得
 */
router.post('/getNextEnquetes', async (req, res, next) => {
  try {
    const perPage = config.get('ENQUETES_PER_PAGE');
    const [enquetes, enquetesToken] = await models.questions.myQuestions(Number(req.user.id), perPage, req.query.enquetesToken);

    const enquetesWithConditions = [];
    for(const question of enquetes){
      const q = await services.setConditions(question, req.cookies[String(question.id)], req.user);
      enquetesWithConditions.push(q);
    }

    return res.render('mypage/top.pug', {
      url: `${req.baseUrl}${req.url}`,
      enquetes: enquetesWithConditions,
      favorites: null,
      enquetesToken: enquetesToken,
      favoritesToken: null,
      maxItemCount: config.get('MAX_ITEM_COUNT'),
    });
  } catch (e){
    console.log(e);
    return next();
  }
});


/**
 * POST /api/getNextFavorites
 *
 * お気に入りアンケートの続きを取得
 */
router.post('/getNextFavorites', async (req, res, next) => {
  try {
    const perPage = config.get('ENQUETES_PER_PAGE');
    const [favorites, favoritesToken] = await models.questions.myFavorites(Number(req.user.id), perPage, req.query.favoritesToken);

    const favoritesWithConditions = [];
    for(const question of favorites){
      const q = await services.setConditions(question, req.cookies[String(question.id)], req.user);
      favoritesWithConditions.push(q);
    }

    return res.render('enquetes/list.pug', {
      url: `${req.baseUrl}${req.url}`,
      enquetes: null,
      favorites: favoritesWithConditions,
      enquetesToken: null,
      favoritesToken: favoritesToken,
      maxItemCount: config.get('MAX_ITEM_COUNT'),
    });
  } catch (e){
    console.log(e);
    return next();
  }
});


module.exports = router;

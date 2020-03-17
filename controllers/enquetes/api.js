'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const models = require('../../models/model-datastore');

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

module.exports = router;

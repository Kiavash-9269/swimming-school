const catalogService = require("./catalog.service");

async function getMarketing(req, res, next) {
  try {
    const data = await catalogService.getMarketingCatalog();
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

async function getRecords(req, res, next) {
  try {
    const data = await catalogService.listRecords();
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

async function putRecords(req, res, next) {
  try {
    const data = await catalogService.replaceRecords(req.body.items);
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

async function resetRecords(req, res, next) {
  try {
    const data = await catalogService.resetRecordsToDefault();
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

async function getSyncStatus(req, res, next) {
  try {
    const data = await catalogService.getSyncStatus();
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

async function postSync(req, res, next) {
  try {
    const data = await catalogService.syncCatalog({
      openRegistration: Boolean(req.body?.openRegistration),
    });
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getMarketing,
  getRecords,
  putRecords,
  resetRecords,
  getSyncStatus,
  postSync,
};

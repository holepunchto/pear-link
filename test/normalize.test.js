'use strict'
const test = require('brittle')
const plink = require('..')

test('normalize: non string types throw ERR_INVALID_LINK error', async function (t) {
  t.plan(9)
  t.exception(() => {
    plink.normalize(0)
  }, /ERR_INVALID_LINK/)
  t.exception(() => {
    plink.normalize(1)
  }, /ERR_INVALID_LINK/)
  t.exception(() => {
    plink.normalize(Buffer.from([0x62, 0x75, 0x66, 0x66, 0x65, 0x72]))
  }, /ERR_INVALID_LINK/)
  t.exception(() => {
    plink.normalize(null)
  }, /ERR_INVALID_LINK/)
  t.exception(() => {
    plink.normalize(undefined)
  }, /ERR_INVALID_LINK/)
  t.exception(() => {
    plink.normalize(false)
  }, /ERR_INVALID_LINK/)
  t.exception(() => {
    plink.normalize(true)
  }, /ERR_INVALID_LINK/)
  t.exception(() => {
    plink.normalize({})
  }, /ERR_INVALID_LINK/)
  t.exception(() => {
    plink.normalize({ id: 'invalid-link' })
  }, /ERR_INVALID_LINK/)
})

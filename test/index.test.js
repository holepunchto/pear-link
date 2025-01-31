'use strict'
const { isWindows } = require('which-runtime')
const path = require('path')
const hypercoreid = require('hypercore-id-encoding')
const test = require('brittle')
const ALIASES = {
  keet: hypercoreid.decode('oeeoz3w6fjjt7bym3ndpa6hhicm8f8naxyk11z4iypeoupn6jzpo'),
  runtime: hypercoreid.decode('nkw138nybdx6mtf98z497czxogzwje5yzu585c66ofba854gw3ro')
}
const pearLink = require('../index.js')(ALIASES)
const normalize = require('../index.js').normalize

test('pear://<key>', (t) => {
  t.plan(5)
  const { protocol, pathname, drive: { length, fork, key } } = pearLink('pear://a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2')
  t.is(protocol, 'pear:')
  t.is(length, 0)
  t.is(fork, null)
  t.is(key.toString('hex'), 'a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2')
  t.absent(pathname)
})

test('pear://key/pathname', (t) => {
  t.plan(5)
  const { protocol, pathname, drive: { length, fork, key } } = pearLink('pear://a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2/some/path.js')
  t.is(protocol, 'pear:')
  t.is(length, 0)
  t.is(fork, null)
  t.is(key.toString('hex'), 'a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2')
  t.is(pathname, '/some/path.js')
})

test('pear://invalid-key', (t) => {
  t.plan(1)
  t.exception(() => {
    pearLink('pear://some-invalid-key')
  }, /Error: Invalid Hypercore key/)
})

test('pear://<alias>', (t) => {
  t.plan(6)
  const { protocol, pathname, drive: { length, fork, key, alias } } = pearLink('pear://keet')
  t.is(protocol, 'pear:')
  t.is(length, 0)
  t.is(fork, null)
  t.is(alias, 'keet')
  t.is(key.toString('hex'), ALIASES.keet.toString('hex'))
  t.absent(pathname)
})

test('pear://alias/path', (t) => {
  t.plan(5)
  const { protocol, pathname, drive: { length, fork, key } } = pearLink('pear://keet/some/path')
  t.is(protocol, 'pear:')
  t.is(length, 0)
  t.is(fork, null)
  t.is(key.toString('hex'), ALIASES.keet.toString('hex'))
  t.is(pathname, '/some/path')
})

test('pear://<fork>.<length>.<key>', (t) => {
  t.plan(3)
  const { protocol, drive } = pearLink('pear://2.2455.b9abnxwa71999xsweicj6ndya8w9w39z7ssg43pkohd76kzcgpmo')
  t.is(protocol, 'pear:')
  t.is(drive.length, 2455)
  t.is(drive.fork, 2)
})

test('pear://<fork>.<length>.<key>.<dhash>/some/path#lochash', (t) => {
  t.plan(7)
  const { protocol, pathname, drive, hash } = pearLink('pear://2.2455.b9abnxwa71999xsweicj6ndya8w9w39z7ssg43pkohd76kzcgpmo.b9abnxwa71999xsweicj6ndya8w9w39z7ssg43pkohd76kzcgpmo/some/path#lochash')
  t.is(pathname, '/some/path')
  t.is(protocol, 'pear:')
  t.is(hash, '#lochash')
  t.is(drive.length, 2455)
  t.is(drive.fork, 2)
  t.is(drive.hash.toString('hex'), '0ff0113e98ecbfffbed445589f0860c1e9fa67f7edac6d65aa8707df2aec3357')
  t.is(drive.key.toString('hex'), '0ff0113e98ecbfffbed445589f0860c1e9fa67f7edac6d65aa8707df2aec3357')
})

test('pear://alias/path', (t) => {
  t.plan(5)
  const { protocol, pathname, drive: { length, fork, key } } = pearLink('pear://keet/some/path')
  t.is(protocol, 'pear:')
  t.is(length, 0)
  t.is(fork, null)
  t.is(key.toString('hex'), ALIASES.keet.toString('hex'))
  t.is(pathname, '/some/path')
})

test('file:///path', (t) => {
  t.plan(3)
  const { drive, protocol, pathname } = pearLink('file:///path/to/file.js')
  t.is(drive.key, null)
  t.is(protocol, 'file:')
  t.is(pathname, '/path/to/file.js')
})

test('relative path', (t) => {
  t.plan(3)
  const { drive, protocol, pathname } = pearLink('foobar')
  t.is(drive.key, null)
  t.is(protocol, 'file:')
  t.is(isWindows ? path.normalize(pathname.slice(1)) : pathname, path.join(cwd(), 'foobar'))
})

test('absolute path', (t) => {
  t.plan(3)
  const abspath = (isWindows ? '/' + cwd().split(path.win32.sep).join(path.posix.sep) : cwd()) + '/foobar'
  const { drive, protocol, pathname } = pearLink(abspath)
  t.is(drive.key, null)
  t.is(protocol, 'file:')
  t.is(isWindows ? path.normalize(pathname.slice(1)) : pathname, path.join(cwd(), 'foobar'))
})

test('absolute drive-lettered win path', (t) => {
  t.plan(3)
  const abspath = 'D:\\abs\\path'
  const { drive, protocol, pathname } = pearLink(abspath)
  t.is(drive.key, null)
  t.is(protocol, 'file:')
  t.is(pathname, '/D:/abs/path')
})

test('file://non-root-path', (t) => {
  t.plan(1)
  t.exception(() => {
    pearLink('file://file.js')
  }, /Path needs to start from the root, "\/"/)
})

test('Unsupported protocol', (t) => {
  t.plan(1)
  t.exception(() => {
    pearLink('someprotocol://thats-not-supported')
  }, /Protocol is not supported/)
})

test('empty link', (t) => {
  t.plan(1)
  t.exception(() => { pearLink() }, /No link specified/)
})

test('url link normalize', (t) => {
  t.plan(1)
  t.is(normalize('file://a/b/'), 'file://a/b')
})

function cwd () {
  return path.resolve('.')
}

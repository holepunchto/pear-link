'use strict'
const { isWindows } = require('which-runtime')
const path = require('path')
const test = require('brittle')
const { decode } = require('hypercore-id-encoding')
const { pathToFileURL } = require('url-file-url')
const plink = require('..')

test('./some/path/to/a/file.js', function (t) {
  t.plan(7)
  const res = plink.parse('./some/path/to/a/file.js')
  t.is(res.protocol, 'file:')
  t.is(res.pathname, pathToFileURL('./some/path/to/a/file.js').pathname)
  t.is(res.hash, '')
  t.is(res.drive.key, null)
  t.is(res.drive.length, null)
  t.is(res.drive.fork, null)
  t.is(res.drive.hash, null)
})

test('file:///some/path/to/a/file.js', function (t) {
  t.plan(7)
  const res = plink.parse('file:///some/path/to/a/file.js')
  t.is(res.protocol, 'file:')
  t.is(res.pathname, '/some/path/to/a/file.js')
  t.is(res.hash, '')
  t.is(res.drive.key, null)
  t.is(res.drive.length, null)
  t.is(res.drive.fork, null)
  t.is(res.drive.hash, null)
})

test('pear://key', function (t) {
  t.plan(7)
  const key = 'd47c1dfecec0f74a067985d2f8d7d9ad15f9ae5ff648f7bc6ca28e41d70ed221'
  const res = plink.parse(`pear://${key}`)
  t.is(res.protocol, 'pear:')
  t.is(res.pathname, '')
  t.is(res.hash, '')
  t.is(res.drive.key.toString('hex'), key)
  t.is(res.drive.length, null)
  t.is(res.drive.fork, null)
  t.is(res.drive.hash, null)
})

test('pear://fork.length.key', function (t) {
  t.plan(7)
  const key = 'd47c1dfecec0f74a067985d2f8d7d9ad15f9ae5ff648f7bc6ca28e41d70ed221'
  const res = plink.parse(`pear://123.456.${key}`)
  t.is(res.protocol, 'pear:')
  t.is(res.pathname, '')
  t.is(res.hash, '')
  t.is(res.drive.key.toString('hex'), key)
  t.is(res.drive.length, 456)
  t.is(res.drive.fork, 123)
  t.is(res.drive.hash, null)
})

test('pear://fork.length.key.dhash', function (t) {
  t.plan(7)
  const key = 'd47c1dfecec0f74a067985d2f8d7d9ad15f9ae5ff648f7bc6ca28e41d70ed221'
  const dhash =
    '38d8296e972167f4ad37803999fbcac17025271162f44dcdce1188d4bc5bac1d'
  const res = plink.parse(`pear://123.456.${key}.${dhash}`)
  t.is(res.protocol, 'pear:')
  t.is(res.pathname, '')
  t.is(res.hash, '')
  t.is(res.drive.key.toString('hex'), key)
  t.is(res.drive.length, 456)
  t.is(res.drive.fork, 123)
  t.is(res.drive.hash.toString('hex'), dhash)
})

test('invalid link', function (t) {
  t.plan(10)
  t.exception(() => plink.parse())
  t.exception(() => plink.parse(''))
  t.exception(() => plink.parse('pear://invalidkey'))
  t.exception(() => plink.parse('pear://a.b.c.d.e'))
  t.exception(() => plink.parse('pear://123.456'))
  t.exception(() =>
    plink.parse(
      'pear://123.nan.d47c1dfecec0f74a067985d2f8d7d9ad15f9ae5ff648f7bc6ca28e41d70ed221'
    )
  )
  t.exception(() => plink.parse('pear://nan.123.keet'))
  t.exception(() =>
    plink.parse(
      'pear://123.nan.d47c1dfecec0f74a067985d2f8d7d9ad15f9ae5ff648f7bc6ca28e41d70ed221.38d8296e972167f4ad37803999fbcac17025271162f44dcdce1188d4bc5bac1d'
    )
  )
  t.exception(() =>
    plink.parse(
      'pear://nan.123.keet.38d8296e972167f4ad37803999fbcac17025271162f44dcdce1188d4bc5bac1d'
    )
  )
  t.exception(() => plink.parse('unsupport://abc'))
})

test('pear://<key>', (t) => {
  t.plan(6)
  const {
    protocol,
    pathname,
    origin,
    drive: { length, fork, key }
  } = plink.parse(
    'pear://a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2'
  )
  t.is(protocol, 'pear:')
  t.is(length, null)
  t.is(fork, null)
  t.is(
    key.toString('hex'),
    'a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2'
  )
  t.absent(pathname)
  t.is(
    origin,
    'pear://a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2'
  )
})

test('pear://key/pathname', (t) => {
  t.plan(6)
  const {
    protocol,
    pathname,
    origin,
    drive: { length, fork, key }
  } = plink.parse(
    'pear://a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2/some/path.js'
  )
  t.is(protocol, 'pear:')
  t.is(length, null)
  t.is(fork, null)
  t.is(
    key.toString('hex'),
    'a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2'
  )
  t.is(pathname, '/some/path.js')
  t.is(
    origin,
    'pear://a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2c3d4e5a1b2'
  )
})

test('pear://<fork>.<length>.<key>', (t) => {
  t.plan(4)
  const { protocol, origin, drive } = plink.parse(
    'pear://2.2455.b9abnxwa71999xsweicj6ndya8w9w39z7ssg43pkohd76kzcgpmo'
  )
  t.is(protocol, 'pear:')
  t.is(drive.length, 2455)
  t.is(drive.fork, 2)
  t.is(origin, 'pear://b9abnxwa71999xsweicj6ndya8w9w39z7ssg43pkohd76kzcgpmo')
})

test('pear://<fork>.<length>.<key>.<dhash>/some/path#lochash', (t) => {
  t.plan(8)
  const { protocol, pathname, origin, drive, hash } = plink.parse(
    'pear://2.2455.b9abnxwa71999xsweicj6ndya8w9w39z7ssg43pkohd76kzcgpmo.b9abnxwa71999xsweicj6ndya8w9w39z7ssg43pkohd76kzcgpmo/some/path#lochash'
  )
  t.is(pathname, '/some/path')
  t.is(origin, 'pear://b9abnxwa71999xsweicj6ndya8w9w39z7ssg43pkohd76kzcgpmo')
  t.is(protocol, 'pear:')
  t.is(hash, '#lochash')
  t.is(drive.length, 2455)
  t.is(drive.fork, 2)
  t.is(
    drive.hash.toString('hex'),
    '0ff0113e98ecbfffbed445589f0860c1e9fa67f7edac6d65aa8707df2aec3357'
  )
  t.is(
    drive.key.toString('hex'),
    '0ff0113e98ecbfffbed445589f0860c1e9fa67f7edac6d65aa8707df2aec3357'
  )
})

test('file:///path', (t) => {
  t.plan(4)
  const { drive, protocol, pathname, origin } = plink.parse(
    'file:///path/to/file.js'
  )
  t.is(drive.key, null)
  t.is(protocol, 'file:')
  t.is(pathname, '/path/to/file.js')
  t.is(origin, 'file:///path/to/file.js')
})

test('relative path', (t) => {
  t.plan(3)
  const { drive, protocol, pathname } = plink.parse('foobar')
  t.is(drive.key, null)
  t.is(protocol, 'file:')
  t.is(
    isWindows ? path.normalize(pathname.slice(1)) : pathname,
    path.join(cwd(), 'foobar')
  )
})

test('absolute path', (t) => {
  t.plan(3)
  const abspath =
    (isWindows
      ? '/' + cwd().split(path.win32.sep).join(path.posix.sep)
      : cwd()) + '/foobar'
  const { drive, protocol, pathname } = plink.parse(abspath)
  t.is(drive.key, null)
  t.is(protocol, 'file:')
  t.is(
    isWindows ? path.normalize(pathname.slice(1)) : pathname,
    path.join(cwd(), 'foobar')
  )
})

test('absolute drive-lettered win path', (t) => {
  t.plan(3)
  const abspath = 'D:\\abs\\path'
  const { drive, protocol, pathname } = plink.parse(abspath)
  t.is(drive.key, null)
  t.is(protocol, 'file:')
  t.is(pathname, '/D:/abs/path')
})

test('file://non-root-path', (t) => {
  t.plan(1)
  t.exception(() => {
    plink.parse('file://file.js')
  }, /Path needs to start from the root, "\/"/)
})

test('Unsupported protocol', (t) => {
  t.plan(1)
  t.exception(() => {
    plink.parse('someprotocol://thats-not-supported')
  }, /Protocol is not supported/)
})

test('empty link', (t) => {
  t.plan(1)
  t.exception(() => {
    plink.parse()
  }, /No link specified/)
})

test('plink.normalize', (t) => {
  t.plan(1)
  t.is(plink.normalize('file:///a/b/'), 'file:///a/b')
})

test('plink.serialize', (t) => {
  t.plan(7)
  t.is(plink.serialize(plink.parse('file:///a/b')), 'file:///a/b')
  t.is(plink.serialize(plink.parse('/a/b')), 'file:///a/b')
  t.is(plink.serialize(plink.parse('/a/b?query')), 'file:///a/b?query')
  t.is(
    plink.serialize(
      plink.parse(
        'pear://b9abnxwa71999xsweicj6ndya8w9w39z7ssg43pkohd76kzcgpmo/b?query'
      )
    ),
    'pear://b9abnxwa71999xsweicj6ndya8w9w39z7ssg43pkohd76kzcgpmo/b?query'
  )
  t.is(
    plink.serialize('b9abnxwa71999xsweicj6ndya8w9w39z7ssg43pkohd76kzcgpmo'),
    'pear://b9abnxwa71999xsweicj6ndya8w9w39z7ssg43pkohd76kzcgpmo'
  )
  t.is(
    plink.serialize(
      decode('b9abnxwa71999xsweicj6ndya8w9w39z7ssg43pkohd76kzcgpmo')
    ),
    'pear://b9abnxwa71999xsweicj6ndya8w9w39z7ssg43pkohd76kzcgpmo'
  )
  t.exception(() => plink.serialize('http://example.com'), /Unsupported/)
})

test('origin: file://', (t) => {
  t.plan(6)
  t.is(plink.parse('file:///Users/user/app').origin, 'file:///Users/user/app')
  t.is(plink.parse('file:///Users/user/app/').origin, 'file:///Users/user/app')
  t.is(
    plink.parse('file:///Users/user/app/#fragment').origin,
    'file:///Users/user/app'
  )
  t.is(
    plink.parse('file:///Users/user/app#fragment').origin,
    'file:///Users/user/app'
  )
  t.is(
    plink.parse('file:///Users/user/app/?query').origin,
    'file:///Users/user/app'
  )
  t.is(
    plink.parse('file:///Users/user/app?query').origin,
    'file:///Users/user/app'
  )
})

test('origin: pear://', (t) => {
  t.plan(2)
  t.is(
    plink.parse(
      'pear://2.2455.b9abnxwa71999xsweicj6ndya8w9w39z7ssg43pkohd76kzcgpmo.b9abnxwa71999xsweicj6ndya8w9w39z7ssg43pkohd76kzcgpmo/some/path#lochash'
    ).origin,
    'pear://b9abnxwa71999xsweicj6ndya8w9w39z7ssg43pkohd76kzcgpmo'
  )
  t.is(
    plink.parse(
      'pear://2.2455.b9abnxwa71999xsweicj6ndya8w9w39z7ssg43pkohd76kzcgpmo.b9abnxwa71999xsweicj6ndya8w9w39z7ssg43pkohd76kzcgpmo/some/path?query'
    ).origin,
    'pear://b9abnxwa71999xsweicj6ndya8w9w39z7ssg43pkohd76kzcgpmo'
  )
})

test('origin: /', (t) => {
  t.plan(6)
  t.is(plink.parse('/Users/user/app').origin, 'file:///Users/user/app')
  t.is(plink.parse('/Users/user/app/').origin, 'file:///Users/user/app')
  t.is(
    plink.parse('/Users/user/app/#fragment').origin,
    'file:///Users/user/app'
  )
  t.is(plink.parse('/Users/user/app#fragment').origin, 'file:///Users/user/app')
  t.is(plink.parse('/Users/user/app/?query').origin, 'file:///Users/user/app')
  t.is(plink.parse('/Users/user/app?query').origin, 'file:///Users/user/app')
})

test('origin: Unix', { skip: isWindows }, (t) => {
  t.plan(1)
  t.is(plink.parse('/Users/user/app/').origin, 'file:///Users/user/app')
})

test('origin: Windows', { skip: !isWindows }, (t) => {
  t.plan(1)
  t.is(
    plink.parse('C:\\Users\\user\\app\\').origin,
    'file:///C:/Users/user/app'
  )
})

test('search', (t) => {
  t.plan(2)
  t.is(plink.parse('file:///Users/user/app/?test').search, '?test')
  t.is(
    plink.parse(
      'pear://2.2455.b9abnxwa71999xsweicj6ndya8w9w39z7ssg43pkohd76kzcgpmo.b9abnxwa71999xsweicj6ndya8w9w39z7ssg43pkohd76kzcgpmo/some/path?test#lochash'
    ).search,
    '?test'
  )
})

function cwd() {
  return path.resolve('.')
}

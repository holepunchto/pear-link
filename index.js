'use strict'
const { isBare } = require('which-runtime')
const { cwd } = isBare ? require('bare-os') : process
const { decode } = require('hypercore-id-encoding')
const FILE = 'file:'
const PEAR = 'pear:'
const DOUB = '//'
module.exports = (aliases, error = (msg) => { throw new Error(msg) }) => {
  return function parse (url) {
    if (!url) throw error('No link specified')
    const isPath = url.startsWith(PEAR + DOUB) === false && url.startsWith(FILE + DOUB) === false
    const isRelativePath = isPath && url.startsWith('/') === false
    const {
      protocol,
      pathname,
      hostname
    } = isRelativePath ? new URL(url, FILE + DOUB + cwd() + '/') : new URL(isPath ? FILE + DOUB + url : url)
    if (protocol === FILE) {
      // file:///some/path/to/a/file.js
      const startsWithRoot = hostname === ''
      if (!pathname) throw error('Path is missing')
      if (!startsWithRoot) throw error('Path needs to start from the root, "/"')
      return {
        protocol,
        pathname
      }
    } else if (protocol === PEAR) {
      const [fork, length, keyOrAlias, hash] = hostname.split('.')
      const parts = hostname.split('.').length

      if (parts === 1) { // pear://keyOrAlias[/some/path]
        return {
          protocol,
          length: 0,
          fork: null,
          key: aliases[hostname]?.buffer || decode(hostname),
          pathname
        }
      }

      if (parts === 2) { // pear://fork.length[/some/path]
        throw error('Incorrect hostname')
      }

      if (parts === 3) { // pear://fork.length.keyOrAlias[/some/path]
        const isForkANumber = Number.isNaN(Number(fork))
        const isLengthANumber = Number.isNaN(Number(length))
        if (!isForkANumber || !isLengthANumber) throw error('Incorrect hostname')

        return {
          protocol,
          length: Number(length),
          fork: Number(fork),
          key: aliases[keyOrAlias]?.buffer || decode(keyOrAlias),
          pathname
        }
      }

      if (parts === 4) { // pear://fork.length.keyOrAlias.hash[/some/path]
        const isForkANumber = Number.isNaN(Number(fork))
        const isLengthANumber = Number.isNaN(Number(length))
        if (!isForkANumber || !isLengthANumber) throw error('Incorrect hostname')

        return {
          protocol,
          length: Number(length),
          fork: Number(fork),
          key: aliases[keyOrAlias]?.buffer || decode(keyOrAlias),
          hash: decode(hash),
          pathname
        }
      }

      throw error('Incorrect hostname')
    }

    throw error('Protocol is not supported')
  }
}

const { createCA, createCert } = require('mkcert')

createCA({
  organization: 'null',
  countryCode: 'null',
  state: 'null',
  locality: 'null',
  validity: 1,
})
  .then(ca => {
    console.log(ca)
    return createCert({
      ca: { key: ca.key, cert: ca.cert },
      domains: ['baidu.com'],
      validity: 1,
    })
  })
  .then(cert => {
    console.log(cert)
  })

// pem.createCertificate(
//   { days: 365, selfSigned: true, commonName: '127.0.0.1' },
//   (err, keys) => {
//     const cert = keys.certificate
//     const key = keys.serviceKey

//     fs.writeFileSync('./keys2/certificate.pem', cert)
//     fs.writeFileSync('./keys2/private-key.pem', key)
//   }
// )

// mkcert mysite.example

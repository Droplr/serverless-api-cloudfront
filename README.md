# serverless-api-cloudfront

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![npm version](https://badge.fury.io/js/serverless-api-cloudfront.svg)](https://badge.fury.io/js/serverless-api-cloudfront)
[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/Droplr/serverless-api-cloudfront/master/LICENSE)
[![npm downloads](https://img.shields.io/npm/dt/serverless-api-cloudfront.svg?style=flat)](https://www.npmjs.com/package/serverless-api-cloudfront)

Automatically creates properly configured AWS CloudFront distribution that routes traffic
to API Gateway.

Due to limitations of API Gateway Custom Domains, we realized that setting self-managed CloudFront distribution is much more powerful.

**:zap: Pros**

- Allows you to set-up custom domain for your API Gateway
- Enables CDN caching of resources - so you don't waste Lambda invocations or API Gateway traffic
  for serving static files (just set proper Cache-Control in API responses)
- Much more CloudWatch statistics of API usage (like bandwidth metrics)
- Real world [access log](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/AccessLogs.html) - out of the box, API Gateway currently does not provide any kind of real "apache-like" access logs for your invocations
- [Web Application Firewall](https://aws.amazon.com/waf/) support - enable AWS WAF to protect your API from security threats

## Installation

```
$ npm install --save-dev serverless-api-cloudfront
```

## Configuration

* All apiCloudFront configuration parameters are optional - e.g. don't provide ACM Certificate ARN
  to use default CloudFront certificate (which works only for default cloudfront.net domain).
* This plugin **does not** set-up automatically Route53 for newly created CloudFront distribution.
  After creating CloudFront distribution, manually add Route53 ALIAS record pointing to your
  CloudFront domain name.
* First deployment may be quite long (e.g. 10 min) as Serverless is waiting for
  CloudFormation to deploy CloudFront distribution.

```
# add in your serverless.yml

plugins:
  - serverless-api-cloudfront

custom:
  apiCloudFront:
    domain: my-custom-domain.com
    certificate: arn:aws:acm:us-east-1:000000000000:certificate/00000000-1111-2222-3333-444444444444
    waf: 00000000-0000-0000-0000-000000000000
    compress: true
    logging:
      bucket: my-bucket.s3.amazonaws.com
      prefix: my-prefix
    cookies: none
    headers:
      - x-api-key
    querystring:
      - page
      - per_page
    priceClass: PriceClass_100
    minimumProtocolVersion: TLSv1
```

### Notes

* `domain` can be list, so if you want to add more domains, instead string you list multiple ones:

```
domain:
  - my-custom-domain.com
  - secondary-custom-domain.com
```

* `cookies` can be *all* (default), *none* or a list that lists the cookies to whitelist
```
cookies:
  - FirstCookieName
  - SecondCookieName
```

* [`headers`][headers-default-cache] can be *all*, *none* (default) or a list of headers ([see CloudFront custom behaviour][headers-list]):

```
headers: all
```

[headers-default-cache]: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-cloudfront-distribution-defaultcachebehavior.html#cfn-cloudfront-distribution-defaultcachebehavior-forwardedvalues
[headers-list]: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/RequestAndResponseBehaviorCustomOrigin.html#request-custom-headers-behavior

* `querystring` can be *all* (default), *none* or a list, in which case all querystring parameters are forwarded, but cache is based on the list:

```
querystring: all
```

* [`priceClass`][price-class] can be `PriceClass_All` (default), `PriceClass_100` or `PriceClass_200`:


```
priceClass: PriceClass_All
```

[price-class]: https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_GetDistributionConfig.html#cloudfront-GetDistributionConfig-response-PriceClass

* [`minimumProtocolVersion`][minimum-protocol-version] can be `TLSv1` (default), `TLSv1_2016`, `TLSv1.1_2016`, `TLSv1.2_2018` or `SSLv3`:


```
minimumProtocolVersion: TLSv1
```

[minimum-protocol-version]: https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_ViewerCertificate.html#cloudfront-Type-ViewerCertificate-MinimumProtocolVersion

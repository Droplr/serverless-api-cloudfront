const path = require('path');
const _ = require('lodash');
const chalk = require('chalk');
const yaml = require('js-yaml');
const fs = require('fs');

const TAG = '[serverless-lambda-cloudfront]';

class ServerlessLambdaCloudFrontPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.hooks = {
      'before:package:createDeploymentArtifacts':
        this.createDeploymentArtifacts.bind(this),
      'aws:info:displayStackOutputs': this.printSummary.bind(this),
    };
  }

  createDeploymentArtifacts() {
    const baseResources =
      this.serverless.service.provider.compiledCloudFormationTemplate;

    const filename = path.resolve(__dirname, 'resources.yml');
    const content = fs.readFileSync(filename, 'utf-8');
    const resources = yaml.load(content, {
      filename: filename,
    });

    this.prepareResources(resources);
    return _.merge(baseResources, resources);
  }

  printSummary() {
    const cloudTemplate = this.serverless;

    const awsInfo = _.find(
      this.serverless.pluginManager.getPlugins(),
      (plugin) => {
        return plugin.constructor.name === 'AwsInfo';
      },
    );

    if (!awsInfo || !awsInfo.gatheredData) {
      return;
    }

    const outputs = awsInfo.gatheredData.outputs;
    const apiDistributionDomain = _.find(outputs, (output) => {
      return output.OutputKey === 'ApiDistribution';
    });

    if (!apiDistributionDomain || !apiDistributionDomain.OutputValue) {
      return;
    }

    const cnameDomain = this.getConfig('domain', '-');

    this.serverless.cli.consoleLog(chalk.yellow('CloudFront domain name'));
    this.serverless.cli.consoleLog(
      `  ${apiDistributionDomain.OutputValue} (CNAME: ${cnameDomain})`,
    );
  }

  prepareResources(resources) {
    const distributionConfig =
      resources.Resources.ApiDistribution.Properties.DistributionConfig;

    this.prepareLogging(distributionConfig);
    this.prepareDomain(distributionConfig);
    this.preparePriceClass(distributionConfig);
    this.prepareOrigins(distributionConfig);
    this.prepareCookies(distributionConfig);
    this.prepareHeaders(distributionConfig);
    this.prepareQueryString(distributionConfig);
    this.prepareComment(distributionConfig);
    this.prepareCertificate(distributionConfig);
    this.prepareWaf(distributionConfig);
    this.prepareCompress(distributionConfig);
    this.prepareMinimumProtocolVersion(distributionConfig);
  }

  prepareLogging(distributionConfig) {
    const loggingBucket = this.getConfig('logging.bucket', null);

    if (loggingBucket !== null) {
      distributionConfig.Logging.Bucket = loggingBucket;
      distributionConfig.Logging.Prefix = this.getConfig('logging.prefix', '');
    } else {
      delete distributionConfig.Logging;
    }
  }

  prepareDomain(distributionConfig) {
    const domain = this.getConfig('domain', null);

    if (domain !== null) {
      distributionConfig.Aliases = Array.isArray(domain) ? domain : [domain];
    } else {
      delete distributionConfig.Aliases;
    }
  }

  preparePriceClass(distributionConfig) {
    const priceClass = this.getConfig('priceClass', 'PriceClass_All');
    distributionConfig.PriceClass = priceClass;
  }

  prepareOrigins(distributionConfig) {
    let lambda = this.getConfig('lambda', '');
    if (!lambda) {
      throw `${TAG} Error: lambda must be set`;
    }
    lambda = lambda.charAt(0).toUpperCase() + lambda.slice(1);
    distributionConfig.Origins[0].DomainName['Fn::Select'][1]['Fn::Split'][1][
      'Fn::GetAtt'
    ][0] = `${lambda}LambdaFunctionUrl`;
  }

  prepareCookies(distributionConfig) {
    const forwardCookies = this.getConfig('cookies', 'all');
    distributionConfig.DefaultCacheBehavior.ForwardedValues.Cookies.Forward =
      Array.isArray(forwardCookies) ? 'whitelist' : forwardCookies;
    if (Array.isArray(forwardCookies)) {
      distributionConfig.DefaultCacheBehavior.ForwardedValues.Cookies.WhitelistedNames =
        forwardCookies;
    }
  }

  prepareHeaders(distributionConfig) {
    const forwardHeaders = this.getConfig('headers', 'none');

    if (Array.isArray(forwardHeaders)) {
      distributionConfig.DefaultCacheBehavior.ForwardedValues.Headers =
        forwardHeaders;
    } else {
      distributionConfig.DefaultCacheBehavior.ForwardedValues.Headers =
        forwardHeaders === 'none' ? [] : ['*'];
    }
  }

  prepareQueryString(distributionConfig) {
    const forwardQueryString = this.getConfig('querystring', 'all');

    if (Array.isArray(forwardQueryString)) {
      distributionConfig.DefaultCacheBehavior.ForwardedValues.QueryString = true;
      distributionConfig.DefaultCacheBehavior.ForwardedValues.QueryStringCacheKeys =
        forwardQueryString;
    } else {
      distributionConfig.DefaultCacheBehavior.ForwardedValues.QueryString =
        forwardQueryString === 'all' ? true : false;
    }
  }

  prepareComment(distributionConfig) {
    const name = this.serverless.getProvider('aws').naming.getApiGatewayName();
    distributionConfig.Comment = `Serverless Managed ${name}`;
  }

  prepareCertificate(distributionConfig) {
    const certificate = this.getConfig('certificate', null);

    if (certificate !== null) {
      distributionConfig.ViewerCertificate.AcmCertificateArn = certificate;
    } else {
      delete distributionConfig.ViewerCertificate;
    }
  }

  prepareWaf(distributionConfig) {
    const waf = this.getConfig('waf', null);

    if (waf !== null) {
      distributionConfig.WebACLId = waf;
    } else {
      delete distributionConfig.WebACLId;
    }
  }

  prepareCompress(distributionConfig) {
    distributionConfig.DefaultCacheBehavior.Compress =
      this.getConfig('compress', false) === true ? true : false;
  }

  prepareMinimumProtocolVersion(distributionConfig) {
    const minimumProtocolVersion = this.getConfig(
      'minimumProtocolVersion',
      undefined,
    );

    if (minimumProtocolVersion) {
      distributionConfig.ViewerCertificate.MinimumProtocolVersion =
        minimumProtocolVersion;
    }
  }

  getConfig(field, defaultValue) {
    return _.get(
      this.serverless,
      `service.custom.lambdaCloudFront.${field}`,
      defaultValue,
    );
  }
}

module.exports = ServerlessLambdaCloudFrontPlugin;

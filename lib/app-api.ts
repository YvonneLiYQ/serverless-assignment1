import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import * as node from "aws-cdk-lib/aws-lambda-nodejs";
import {generateBatch} from "../shared/util";
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import { movies, movieCasts, movieReviews } from "../seed/movies";


type AppApiProps = {
  userPoolId: string;
  userPoolClientId: string;
};

export class AppApi extends Construct {
  constructor(scope: Construct, id: string, props: AppApiProps) {
    super(scope, id);

    // Tables 
    const moviesTable = new dynamodb.Table(this, "MoviesTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "id", type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "Movies",
    });

    const movieCastsTable = new dynamodb.Table(this, "MovieCastTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "movieId", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "actorName", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "MovieCast",
    });

    movieCastsTable.addLocalSecondaryIndex({
      indexName: "roleIx",
      sortKey: { name: "roleName", type: dynamodb.AttributeType.STRING },
    });

    const movieReviewTable = new dynamodb.Table(this, 'MovieReviews', {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {name: 'MovieId', type: dynamodb.AttributeType.NUMBER},
      sortKey: {name: 'ReviewerName', type: dynamodb.AttributeType.STRING},
      tableName: 'MovieReviews',
      removalPolicy: cdk.RemovalPolicy.DESTROY, 
  });
  movieReviewTable.addGlobalSecondaryIndex({
    indexName: 'ReviewerNameIndex',
    partitionKey: {name: 'ReviewerName', type: dynamodb.AttributeType.STRING},
    projectionType: dynamodb.ProjectionType.ALL,
});

const appApi = new apig.RestApi(this, "AppApi", {
  description: "App RestApi",
  endpointTypes: [apig.EndpointType.REGIONAL],
  defaultCorsPreflightOptions: {
      allowOrigins: apig.Cors.ALL_ORIGINS,
  },
});

const appCommonFnProps = {
  architecture: lambda.Architecture.ARM_64,
  timeout: cdk.Duration.seconds(10),
  memorySize: 128,
  runtime: lambda.Runtime.NODEJS_16_X,
  handler: "handler",
  environment: {
      USER_POOL_ID: props.userPoolId,
      CLIENT_ID: props.userPoolClientId,
      REGION: cdk.Aws.REGION,
  },
};



    // Functions 
    const getMovieByIdFn = new lambdanode.NodejsFunction(
      this,
      "GetMovieByIdFn",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: `${__dirname}/../lambdas/getMovieById.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: moviesTable.tableName,
          REGION: 'eu-west-1',
        },
      }
      );
      
      const getAllMoviesFn = new lambdanode.NodejsFunction(
        this,
        "GetAllMoviesFn",
        {
          architecture: lambda.Architecture.ARM_64,
          runtime: lambda.Runtime.NODEJS_18_X,
          entry: `${__dirname}/../lambdas/getAllMovies.ts`,
          timeout: cdk.Duration.seconds(10),
          memorySize: 128,
          environment: {
            TABLE_NAME: moviesTable.tableName,
            REGION: 'eu-west-1',
          },
        }
        );
        
        
  

   const newMovieFn = new lambdanode.NodejsFunction(this, "AddMovieFn", {
    architecture: lambda.Architecture.ARM_64,
    runtime: lambda.Runtime.NODEJS_16_X,
    entry: `${__dirname}/../lambdas/addMovie.ts`,
    timeout: cdk.Duration.seconds(10),
    memorySize: 128,
    environment: {
      TABLE_NAME: moviesTable.tableName,
      REGION: "eu-west-1",
    },
  });
  const deleteMovieFn = new lambdanode.NodejsFunction(this, "DeleteMovieFn", {
    architecture: lambda.Architecture.ARM_64,
    runtime: lambda.Runtime.NODEJS_16_X,
    entry: `${__dirname}/../lambdas/deleteMovie.ts`,
    timeout: cdk.Duration.seconds(10),
    memorySize: 128,
    environment: {
      TABLE_NAME: moviesTable.tableName,
      REGION: "eu-west-1",
    },
  });
  const getMovieCastMembersFn = new lambdanode.NodejsFunction(
    this,
    "GetCastMemberFn",
    {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `${__dirname}/../lambdas/getMovieCastMember.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: movieCastsTable.tableName,
        REGION: "eu-west-1",
      },
    }
  );
  const getReviewsByIdFn = new lambdanode.NodejsFunction(
    this,
    "getReviewsByIdFn",
    {
    architecture: lambda.Architecture.ARM_64,
    runtime: lambda.Runtime.NODEJS_18_X,
    entry: `${__dirname}/../lambdas/getMovieReviews.ts`,
    timeout: cdk.Duration.seconds(10),
    memorySize: 128,
    environment: {
    TABLE_NAME: movieReviewTable.tableName,
    REGION: 'eu-west-1',
    },
    }
    );
    const newReviewFn = new lambdanode.NodejsFunction(
      this,
      "AddReviewFn",
      {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/addMovieReview.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
      TABLE_NAME: movieReviewTable.tableName,
      REGION: 'eu-west-1',
      },
      });

      const updateMovieReviewFn = new lambdanode.NodejsFunction(
        this,
        "updateMovieReviewFn",
        {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: `${__dirname}/../lambdas/updateMovieReview.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
            TABLE_NAME: movieReviewTable.tableName,
            REGION: 'eu-west-1',
        },
        });
        const getReviewsByReviewerFn = new lambdanode.NodejsFunction(this, 'GetReviewsByReviewerFunction', {
          architecture: lambda.Architecture.ARM_64,
          runtime: lambda.Runtime.NODEJS_16_X,
          entry: `${__dirname}/../lambdas/getReviewsByReviewer.ts`,
          timeout: cdk.Duration.seconds(10),
          memorySize: 128,
          environment: {
              TABLE_NAME: movieReviewTable.tableName,
              REGION: 'eu-west-1',
          },
      });
      const getReviewByIdAndReviewerFn = new node.NodejsFunction(this, "GetReviewByIdAndReviewerFn", {
        ...appCommonFnProps,
        entry: "./lambdas/getReviewByIdAndReviewer.ts",
        environment: {
            ...appCommonFnProps.environment, 
            TABLE_NAME: movieReviewTable.tableName, 
        }
    });

    const translateFn = new node.NodejsFunction(this, "Translate", {
      ...appCommonFnProps,
      entry: "./lambdas/translate.ts",
      environment: {
          ...appCommonFnProps.environment, 
          TABLE_NAME: movieReviewTable.tableName, 
      },
  });

//A new IAM which allow translate service
  const translatePolicy = new iam.PolicyStatement({
    actions: ["translate:TranslateText"], 
    resources: ["*"], 
});

translateFn.addToRolePolicy(translatePolicy);


      const getReviewsByParam = new lambdanode.NodejsFunction(this, 'GetReviewsByParam', {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_16_X,
        entry: `${__dirname}/../lambdas/getReviewsByParams.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
            TABLE_NAME: movieReviewTable.tableName,
            REGION: 'eu-west-1',
        },
    })



      new custom.AwsCustomResource(this, "moviesddbInitData", {
        onCreate: {
          service: "DynamoDB",
          action: "batchWriteItem",
          parameters: {
            RequestItems: {
              [moviesTable.tableName]: generateBatch(movies),
              [movieCastsTable.tableName]: generateBatch(movieCasts),  // Added
              [movieReviewTable.tableName]: generateBatch(movieReviews), 
            },
          },
          physicalResourceId: custom.PhysicalResourceId.of("moviesddbInitData"), //.of(Date.now().toString()),
        },
        policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
          resources: [moviesTable.tableArn, movieCastsTable.tableArn, movieReviewTable.tableArn],  // Includes movie cast
        }),
      });



        // Permissions 
        moviesTable.grantReadData(getMovieByIdFn)
        moviesTable.grantReadData(getAllMoviesFn)
        moviesTable.grantReadWriteData(newMovieFn)
        moviesTable.grantReadWriteData(deleteMovieFn)
        movieCastsTable.grantReadData(getMovieCastMembersFn);
        movieCastsTable.grantReadData(getMovieByIdFn);
        movieReviewTable.grantReadData(getReviewsByIdFn);
        movieReviewTable.grantReadData(newReviewFn);
        movieReviewTable.grantReadWriteData(updateMovieReviewFn);
        movieReviewTable.grantReadData(getReviewsByReviewerFn);
        movieReviewTable.grantReadWriteData(getReviewsByParam);
        movieReviewTable.grantReadData(getReviewByIdAndReviewerFn);
        movieReviewTable.grantReadWriteData(translateFn);
// authorizer
const authorizerFn = new node.NodejsFunction(this, "AuthorizerFn", {
  ...appCommonFnProps,
  entry: "./lambdas/auth/authorizer.ts",
});

const requestAuthorizer = new apig.RequestAuthorizer(
  this,
  "RequestAuthorizer",
  {
      identitySources: [apig.IdentitySource.header("cookie")],
      handler: authorizerFn,
      resultsCacheTtl: cdk.Duration.minutes(0),
  }
);
        // REST API 
    const api = new apig.RestApi(this, "RestAPI", {
      description: "demo api",
      deployOptions: {
        stageName: "dev",
      },
      defaultCorsPreflightOptions: {
        allowHeaders: ["Content-Type", "X-Amz-Date"],
        allowMethods: ["OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
        allowCredentials: true,
        allowOrigins: ["*"],
      },
    });
    

    const moviesEndpoint = api.root.addResource("movies");
    moviesEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getAllMoviesFn, { proxy: true })
    );
    moviesEndpoint.addMethod(
      "POST",
      new apig.LambdaIntegration(newMovieFn, { proxy: true })
    );

    const movieEndpoint = moviesEndpoint.addResource("{movieId}");
    movieEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getMovieByIdFn, { proxy: true })
    );
    moviesEndpoint.addMethod(
      "DELETE",
      new apig.LambdaIntegration(deleteMovieFn, { proxy: true })
    );
    const movieCastEndpoint = moviesEndpoint.addResource("cast");
    movieCastEndpoint.addMethod(
         "GET",
          new apig.LambdaIntegration(getMovieCastMembersFn, { proxy: true })
);

const movieReviewEndpoint = movieEndpoint.addResource("reviews");
    movieReviewEndpoint.addMethod(
         "GET",
          new apig.LambdaIntegration(getReviewsByIdFn, { proxy: true })
);

movieReviewEndpoint.addMethod(
  "POST",
  new apig.LambdaIntegration(newReviewFn, { proxy: true })
);

//const reviewerEndpoint = movieReviewEndpoint.addResource("{reviewerName}");
//reviewerEndpoint.addMethod("GET", new apig.LambdaIntegration(getReviewsByIdFn, { proxy: true }));
const reviewerEndpoint = movieReviewEndpoint.addResource("{param}");
reviewerEndpoint.addMethod("GET", new apig.LambdaIntegration(getReviewsByParam, {proxy: true}));

reviewerEndpoint.addMethod('PUT', new apig.LambdaIntegration(updateMovieReviewFn, {proxy: true}),{
  authorizer: requestAuthorizer,
  authorizationType: apig.AuthorizationType.CUSTOM,
});

const reviewsEndpoint = api.root.addResource('reviews');
const allReviewsEndpoint = reviewsEndpoint.addResource('{reviewerName}');

allReviewsEndpoint.addMethod('GET', new apig.LambdaIntegration(getReviewsByReviewerFn));


const reviewByIdAndReviewer = allReviewsEndpoint.addResource('{movieId}');
reviewByIdAndReviewer.addMethod('GET', new apig.LambdaIntegration(getReviewByIdAndReviewerFn));

const translateReview = reviewByIdAndReviewer.addResource('translation');
translateReview.addMethod('GET', new apig.LambdaIntegration(translateFn));
      }
    }
    
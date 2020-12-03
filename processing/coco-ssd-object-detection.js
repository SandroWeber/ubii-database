const tf = require('@tensorflow/tfjs-node');
const cocoSsd = require('@tensorflow-models/coco-ssd');
const { MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const { ProcessingModule } = require('../../src/processing/processingModule.js');

class CoCoSSDObjectDetection extends ProcessingModule {
  constructor(specs) {
    super(specs);

    this.name = 'coco-ssd-object-detection';
    this.tags = ['coco', 'ssd', 'object-detection', 'tensorflow'];
    this.description =
      'All credit goes to https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd. Processes RGB8 image and returns SSD predictions.';

    this.inputs = [
      {
        internalName: 'image',
        messageFormat: MSG_TYPES.DATASTRUCTURE_IMAGE
      }
    ];
    this.outputs = [
      {
        internalName: 'predictions',
        messageFormat: MSG_TYPES.DATASTRUCTURE_OBJECT2D_LIST
      }
    ];

    this.processingMode = {
      frequency: {
        hertz: 10
      }
    };
  }

  onCreated() {
    let prepareModel = async () => {
      this.state.model = await cocoSsd.load();
    };
    prepareModel();
  }

  onProcessing() {
    let image = this.image;
    if (image && this.state.model) {
      // prediction function
      let predict = async () => {
        let imgTensor = tf.tensor3d(image.data, [image.height, image.width, 3], 'int32');
        let predictions = await this.state.model.detect(imgTensor);
        return predictions;
      };

      // make predictions
      predict().then((predictions) => {
        // generate output list
        let outputList = [];
        predictions.forEach((prediction) => {
          let pos = { x: prediction.bbox[0] / image.width, y: prediction.bbox[1] / image.height };
          outputList.push({
            id: prediction.class,
            pose: { position: pos },
            size: { x: prediction.bbox[2] / image.width, y: prediction.bbox[3] / image.height }
          });
        });
        // write output
        this.predictions = { elements: outputList };
      });
    }
  }
}

module.exports = CoCoSSDObjectDetection;

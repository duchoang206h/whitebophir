const fs = require("fs/promises");
const log = require("./log.js").log;
const path = require("path");
const config = require("./configuration.js");
const AWS = require("aws-sdk");
class FileStore {
  constructor() {}
  delete() {}
  /**
   *
   * @param {string} name
   * @returns {string}
   */
  getPath(name) {}
  /**
   *
   * @param {string} name
   * @param {string} data
   */
  async save(name, data) {}
  /**
   *
   * @param {string} name
   * @returns {Promise<string>}
   */
  async load(name) {}
}
class DiskStore extends FileStore {
  constructor() {
    super();
  }
  getPath(name) {
    return path.join(
      config.HISTORY_DIR,
      "board-" + encodeURIComponent(name) + ".json",
    );
  }
  async save(name, data) {
    const backupFile = this.backupFileName(name);
    await fs.writeFile(backupFile, data, { flag: "wx" });
    await fs.rename(backupFile, this.getPath(name));
  }
  backupFileName(baseName) {
    var date = new Date().toISOString().replace(/:/g, "");
    return baseName + "." + date + ".bak";
  }
  async load(name) {
    try {
      const path = this.getPath(name);
      return fs.readFile(path);
    } catch (error) {
      log("error", { error: error.toString() });
      return "{}";
    }
  }
}
class S3Store extends FileStore {
  constructor() {
    super();
    this.bucket = config.S3_BUCKET;
    AWS.config.update({
      apiVersion: "latest",
      credentials: {
        accessKeyId: config.S3_ACCESS_KEY,
        secretAccessKey: config.S3_SECRET_KEY,
      },
      region: config.S3_REGION,
    });
    this.s3 = new AWS.S3();
  }
  getPath(name) {
    return `https://${this.bucket}.amazonaws.com/boards/${encodeURIComponent(name)}.json`;
  }
  async save(name, data) {
    try {
      const params = {
        Bucket: this.bucket,
        Key: `boards/${encodeURIComponent(name)}.json`,
        Body: data,
      };
      return this.s3.putObject(params).promise();
    } catch (error) {
      log("error", { error: error.toString() });
    }
  }
  async load(name) {
    try {
      const params = {
        Bucket: this.bucket,
        Key: `boards/${encodeURIComponent(name)}.json`,
      };
      const data = await this.s3.getObject(params).promise();
      return data.Body.toString("utf-8");
    } catch (error) {
      log("error", { error: error.toString() });
      return "{}";
    }
  }
}
/**
 *
 * @param {string} name
 * @returns {FileStore}
 */
function newFileStore(name) {
  switch (name) {
    case "local":
      return new DiskStore();
    case "s3":
      return new S3Store();
    default:
      return new DiskStore();
  }
}
module.exports = {
  FileStore,
  newFileStore,
};

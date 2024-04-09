// https://github.com/AElfProject/aelf-command/blob/master/src/utils/utils.js

import AElf from "aelf-sdk";

async function getProto(aelf, address) {
  return AElf.pbjs.Root.fromDescriptor(
    await aelf.chain.getContractFileDescriptorSet(address)
  );
}

export async function deserializeLogs(aelf, logs = []) {
  if (!logs || logs.length === 0) {
    return null;
  }
  let results = await Promise.all(logs.map((v) => getProto(aelf, v.Address)));
  results = results.map((proto, index) => {
    const { Name: dataTypeName, NonIndexed, Indexed = [] } = logs[index];
    const serializedData = [...(Indexed || [])];
    if (NonIndexed) {
      serializedData.push(NonIndexed);
    }
    const dataType = proto.lookupType(dataTypeName);
    let deserializeLogResult = serializedData.reduce((acc, v) => {
      let deserialize = dataType.decode(Buffer.from(v, "base64"));
      deserialize = dataType.toObject(deserialize, {
        enums: String, // enums as string names
        longs: String, // longs as strings (requires long.js)
        bytes: String, // bytes as base64 encoded strings
        defaults: false, // includes default values
        arrays: true, // populates empty arrays (repeated fields) even if defaults=false
        objects: true, // populates empty objects (map fields) even if defaults=false
        oneofs: true, // includes virtual oneof fields set to the present field's name
      });
      return {
        ...acc,
        ...deserialize,
      };
    }, {});
    // eslint-disable-next-line max-len
    deserializeLogResult = AElf.utils.transform.transform(
      dataType,
      deserializeLogResult,
      AElf.utils.transform.OUTPUT_TRANSFORMERS
    );
    deserializeLogResult = AElf.utils.transform.transformArrayToMap(
      dataType,
      deserializeLogResult
    );
    return deserializeLogResult;
  });
  return results;
}

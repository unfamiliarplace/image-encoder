const baseURL = "https://g.sawczak.com/image-encoder";

const maxHistoryStates = 5;

let canvasWidth = 500;
let maxPixels = 300_000;

let baseBorder = 2;
let basePixels = 2;
let baseDimensions = 2;

let optHexModeDimensions = null;
let optRGBModePixels = null;
let optRGBModeBorder = null;

let defaultWidth = "101";
let defaultHeight = "101";
let defaultPixels = "1010110101111110111010001";
let defaultBorder = "1";

let defaultHexModeDimensions = false;
let defaultRGBModePixels = false;
let defaultRGBModeBorder = false;

let canvasEl = null;
let canvas = null;
let ctx = null;

const stage = new Stage();

const addScenes = () => {
  stage.addScene(
    new Scene("game", "#gamePanel", "", [$("#gamePanel button")])
  );
  stage.addScene(new Scene("help", "#helpPanel", "#btnHelp", []));

  stage.setDefault("game");
};

addScenes();

const handleKeyup = (e) => {
  switch (e.code) {
    case "KeyR":
      reset();
      break;

    case "KeyH":
      stage.toggle("help");
      break;

    case "KeyU":
      copyShareURL();
      break;
  }
};

const filterInput = (input, base) => {
  let acceptable = [];

  if (base === 2) {
    acceptable = "01".split("");
  } else {
    acceptable = "0123456789ABCDEF".split("");
  }

  let filtered = "";
  for (let c of input.toUpperCase()) {
    if (acceptable.includes(c)) {
      filtered += c;
    }
  }
  return filtered;
};

const updateContent = () => {
  updateShareURL();
  updateImage();
};

const updateImage = () => {
  // basics

  canvasEl.attr("width", `${canvasWidth}px`);
  canvasEl.attr("height", `${canvasWidth}px`);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // dimensions

  let nCols = $("#width").val();
  let nRows = $("#height").val();

  nCols = filterInput(nCols, baseDimensions);
  nRows = filterInput(nRows, baseDimensions);

  nCols = parseInt(nCols, baseDimensions);
  nRows = parseInt(nRows, baseDimensions);
  
  if ((nCols * nRows) > maxPixels) {
    ctx.font = "18px Courier New";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText(`Dimensions are too great.`, canvas.width / 2, (canvas.height / 2) - 25); 
    ctx.fillText(`Maximum pixels = ${maxPixels}`, canvas.width / 2, (canvas.height / 2) + 25); 
    ctx.fillText(`...in decimal :)`, canvas.width / 2, (canvas.height / 2) + 75); 
    return;
  }

  let borderColour = filterInput($("#border").val(), baseBorder);
  borderColour = getPixelColour(borderColour, baseBorder);

  let nColsPlusBorder = nCols;
  let nRowsPlusBorder = nRows;

  if (borderColour !== "transparent") {
    nColsPlusBorder += 2;
    nRowsPlusBorder += 2;
  }

  // basix pixel side and then resizing canvas to get integer pixels
  // plus bounding it to the longer dimension
  
  let pixelSide, longerDimension, longerSide, shorterDimension, shorterSide;
  
  if (nCols > nRows) {
    pixelSide = Math.round(canvas.width / nColsPlusBorder);
    
    longerDimension = "width";
    shorterDimension = "height";
    
    longerSide = pixelSide * nColsPlusBorder;
    shorterSide = pixelSide * nRowsPlusBorder;
    
  } else {
    pixelSide = Math.round(canvas.height / nRowsPlusBorder);
    
    longerDimension = "height";
    shorterDimension = "width";
    
    longerSide = pixelSide * nRowsPlusBorder;
    shorterSide = pixelSide * nColsPlusBorder;
  }

  canvasEl.attr(longerDimension, longerSide);
  canvasEl.attr(shorterDimension, shorterSide);
  
  // borders

  let borderSide = 0;
  if (borderColour !== "transparent") {
    borderSide = pixelSide;
    // draw border
    ctx.fillStyle = borderColour;

    // top and bottom edges
    for (let i = 0; i < nColsPlusBorder; i++) {
      ctx.fillRect(i * borderSide, 0, borderSide, borderSide);

      ctx.fillRect(
        i * borderSide,
        canvas.height - borderSide,
        borderSide,
        borderSide
      );
    }

    // left and right edges
    for (let i = 1; i < nRowsPlusBorder - 1; i++) {
      ctx.fillRect(0, i * borderSide, borderSide, borderSide);

      ctx.fillRect(
        canvas.width - borderSide,
        i * borderSide,
        borderSide,
        borderSide
      );
    }
  }

  // pixels
  
  let pixels = getPixelList();
  let colour, i, startX, startY;

  for (let row = 0; row < nRows; row++) {
    for (let col = 0; col < nCols; col++) {
      i = row * nCols + col;

      if (i >= pixels.length) {
        colour = "transparent";
      } else {
        colour = getPixelColour(pixels[i], basePixels);
      }

      ctx.fillStyle = colour;

      ctx.fillRect(
        col * pixelSide + borderSide,
        row * pixelSide + borderSide,
        pixelSide,
        pixelSide
      );
    }
  }
};

const getPixelColour = (pixel, base) => {
  if (pixel === "") {
    return "transparent";
  } else if (base === 2) {
    return pixel === "0" ? "#000000" : "#FFFFFF";
  } else {
    return `#${pixel}`;
  }
};

const reset = () => {
  let settings = "";
  settings += defaultHexModeDimensions ? "1" : "0";
  settings += defaultRGBModePixels ? "1" : "0";
  settings += defaultRGBModeBorder ? "1" : "0";

  setData(defaultWidth, defaultHeight, defaultPixels, defaultBorder, settings);
};

const createDynamicOptions = () => {
  optHexModeDimensions = new OptionCheckbox($("#optHexModeDimensions"));
  optRGBModePixels = new OptionCheckbox($("#optRGBModePixels"));
  optRGBModeBorder = new OptionCheckbox($("#optRGBModeBorder"));
};

const getPixelList = () => {
  let currText = filterInput($("#pixels").val(), basePixels);

  let list = [];

  if (basePixels === 2) {
    list = currText.split("");
  } else {
    let block = "";
    for (let i = 0; i < currText.length; i++) {
      if (i > 0 && !(i % 6)) {
        list.push(block);
        block = "";
      }
      block += currText[i];
    }
    list.push(block);
  }

  return list;
};

const pixelBinToHex = (pixel) => {
  return pixel === "0" ? "000000" : "FFFFFF";
};

const pixelHexToBin = (pixel) => {
  let total =
    parseInt(pixel.substr(0, 2), 16) +
    parseInt(pixel.substr(2, 2), 16) +
    parseInt(pixel.substr(4, 2), 16);
  if (total / 3 >= Math.pow(2, 7)) {
    return "1";
  } else {
    return "0";
  }
};

const toggleRGBModePixels = () => {
  let pixelList = getPixelList();
  let newPixelList = [];

  basePixels = optRGBModePixels.value() ? 16 : 2;

  let total = 0;
  if (basePixels === 2) {
    for (let block of pixelList) {
      newPixelList.push(pixelHexToBin(block));
    }
  } else {
    for (let block of pixelList) {
      newPixelList.push(pixelBinToHex(block));
    }
  }

  $("#pixels").val(newPixelList.join(""));
  updateContent();
};

const toggleHexModeDimensions = () => {
  let currWidth = filterInput($("#width").val(), baseDimensions);
  let currHeight = filterInput($("#height").val(), baseDimensions);

  baseDimensions = optHexModeDimensions.value() ? 16 : 2;
  let newWidth, newHeight;

  if (baseDimensions === 2) {
    newWidth = parseInt(currWidth, 16).toString(2);
    newHeight = parseInt(currHeight, 16).toString(2);
  } else {
    newWidth = parseInt(currWidth, 2).toString(16);
    newHeight = parseInt(currHeight, 2).toString(16);
  }

  $("#width").val(newWidth);
  $("#height").val(newHeight);

  updateContent();
};

const toggleRGBModeBorder = () => {
  let currColour = filterInput($("#border").val(), baseBorder);

  baseBorder = optRGBModeBorder.value() ? 16 : 2;
  let newColour;

  if (currColour === "") {
    newColour = "transparent";
  } else if (baseBorder === 16) {
    newColour = pixelBinToHex(currColour);
    $("#border").val(newColour);
  } else {
    newColour = pixelHexToBin(currColour);
    $("#border").val(newColour);
  }

  updateContent();
};

/* Link IO */

const compileSaveData = () => {
  let data = {};

  data["width"] = parseInt(
      filterInput($("#width").val(), baseDimensions),
      baseDimensions
  ).toString(36);
  data["height"] = parseInt(
      filterInput($("#height").val(), baseDimensions),
      baseDimensions
  ).toString(36);
  data["pixels"] = lio.compress(filterInput($("#pixels").val(), basePixels));
  data["border"] = parseInt(
      filterInput($("#border").val(), baseBorder),
      baseBorder
  ).toString(36);

  data["settings"] = "";
  data["settings"] += optHexModeDimensions.value() ? "1" : "0";
  data["settings"] += optRGBModePixels.value() ? "1" : "0";
  data["settings"] += optRGBModeBorder.value() ? "1" : "0";

  return data;
};

const packSaveData = () => {
  let data = compileSaveData();

  JSTools.renameObjectKeys(data, {
    width: "w",
    height: "h",
    pixels: "p",
    border: "b",
    settings: "s",
  });

  return data;
}

const unpackSaveData = (data) => {
  JSTools.renameObjectKeys(data, {
    w: "width",
    h: "height",
    p: "pixels",
    b: "border",
    s: "settings"
  });

  if (!data.hasOwnProperty("settings")) {
    return;
  }

  let w = parseInt(data["width"], 36);
  let h = parseInt(data["height"], 36);
  let p = lio.decompress(data["pixels"]);
  let b = parseInt(data["border"], 36);
  let s = data["settings"];

  setData(w, h, p, b, s);
}

const setData = (width, height, pixels, border, settings) => {
  optHexModeDimensions.value(settings[0] === "1");
  optRGBModePixels.value(settings[1] === "1");
  optRGBModeBorder.value(settings[2] === "1");

  toggleHexModeDimensions();
  toggleRGBModePixels();
  toggleRGBModeBorder();

  $("#width").val(width.toString(baseDimensions));
  $("#height").val(height.toString(baseDimensions));
  $("#pixels").val(pixels.toString(basePixels));
  $("#border").val(border.toString(baseBorder));

  updateContent();
};

const copyShareURL = () => {
  copyToast = Copy.toast(copyToast, lio.shareURL, 'Copied share URL!');
};

const updateShareURL = () => {

  if (lio.shareURLIsValid()) {
    $('#shareURL').removeClass('hide');
    $('#shareURLInvalidNotice').addClass('hide');
    $("#shareURL").attr('href', lio.updateShareURL());

  } else {
    $('#shareURL').addClass('hide');
    $('#shareURLInvalidNotice').removeClass('hide');
  }
};

/* History */

const historyBack = () => {
  console.log('stepped back in history');

  if (historyState <= (-1 * (maxHistoryStates - 1))) {
    return;
  }

  historyState -= 1;
  restoreHistory(historyState);
}

const historyForward = () => {
  console.log('stepped forward in history');

  if (historyState >= 0) {
    return;
  }

  historyState += 1;
  restoreHistory(historyState);
}

const saveHistory = () => {
  console.log('saved history');
}

const restoreHistory = (id) => {
  console.log(`restored history ${id}`);
}

/* Other */

const toggleControl = (control, enable) => {
  control.prop("disabled", !enable);
};

const initializeCanvas = () => {
  canvasEl = $("#canvas");
  canvas = canvasEl.get(0);
  ctx = canvas.getContext("2d");
  ctx.globalCompositeOperation = "lighter";
};

const bind = () => {
  $("#optHexModeDimensions").change(toggleHexModeDimensions);
  $("#optRGBModePixels").change(toggleRGBModePixels);
  $("#optRGBModeBorder").change(toggleRGBModeBorder);

  $("#width").keyup(updateContent);
  $("#height").keyup(updateContent);
  $("#pixels").keyup(updateContent);
  $("#border").keyup(updateContent);

  $("#btnReset").click(reset);
  $("#btnCopyShareURL").click(copyShareURL);

  $('#btnHistoryBack').click(historyBack);
  $('#btnHistoryForward').click(historyForward);

  $(document).keyup(handleKeyup);
};

const initialize = () => {
  initializeCanvas();
  createDynamicOptions();
  bind();
  stage.show("game");
  reset();
  lio.readURL();
};

let history = [];
let historyState = 0;

let copyToast;
let lio = new LinkIO(
    baseURL,
    packSaveData,
    unpackSaveData,
    () => {
      return false; // TODO dataIsDefault
    }
);

$(document).ready(initialize);

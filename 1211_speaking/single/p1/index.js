const api = getApp().api
const loadingProgress = require('../../../../behaviors/loadingProgress')
let timer
let recorderManager
let audioContext
Page({
  behaviors: [loadingProgress],
  // ===========生命周期 Start===========
  data: {
    recorderState: 'stop',
    recorderConfig: {
      duration: 60000,
      sampleRate: 48000,
      numberOfChannels: 1,
      encodeBitRate: 320000,
      format: 'mp3',
      frameSize: 50
    },
    nowTime: 0,
    file: {
      time: "",
      url: "",
      duration: 0
    },
    audioStatus: "stop",
    openFlag: false,
    originalFlag: false,
  },
  onLoad(options) {
    recorderManager = wx.getRecorderManager()
    recorderManager.onStart(() => {
      this.startRecoding()
    })
    recorderManager.onStop(res => {
      audioContext.src = res.tempFilePath
      let time = api.formatTime(new Date())
      this.setData({
        [`file.time`]: time,
        [`file.url`]: res.tempFilePath,
        recorderState: 'over'
      })
      clearInterval(timer)
    })
    recorderManager.onError((res) => {
      api.recorderErr("P1", res.errMsg)
    })

    audioContext = wx.createInnerAudioContext()
    audioContext.onEnded(() => {
      this.stopAduio()
    })
    audioContext.onError((res) => {
      console.log(res);
    })
    wx.enableAlertBeforeUnload({
      message: "未保存录音退出将丢失录音文件，是否退出？",
    });
  },
  onShow() {
    this.startLoading()
    this.getData(true)
    wx.getSetting({
      success(res) {
        if (!res.authSetting['scope.record']) {
          wx.authorize({
            scope: 'scope.record'
          })
        }
      }
    })
  },
  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() { },
  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    audioContext.stop()
    recorderManager.stop()
    clearInterval(timer)
  },
  // ===========生命周期 End===========
  // ===========业务操作 Start===========
  // 验证录音权限
  gatUserAuthor() {
    const then = this
    wx.getSetting({
      success(res) {
        if (res.authSetting['scope.record']) {
          then.initRecoding()
        } else {
          api.toast("未开启麦克风权限无法进行录音")
        }
      }
    })
  },
  // 初始化录音器，开始录音
  initRecoding() {
    const { recorderConfig } = this.data
    recorderManager.start(recorderConfig)
  },
  // 录音开始，修改状态
  startRecoding() {
    this.setData({
      recorderState: 'play',
      nowTime: Date.now(),
    })
    this.recordingTimer()
    // this.startPlayingQuesionAudio()
  },
  // 更新录音时间
  recordingTimer() {
    timer = setInterval(() => {
      const { nowTime } = this.data
      const difference = Date.now() - nowTime;
      this.setData({
        [`file.duration`]: Math.round(difference / 1000)
      })
    }, 100);
  },
  // 停止录音
  stopRecoding() {
    recorderManager.stop()
    clearInterval(timer)
  },
  // 如果有题目音频则播放题目音频
  startPlayingQuesionAudio() {
    const { detail } = this.data
    if (!api.isEmpty(detail.audioUrl)) {
      audioContext.src = detail.audioUrl
      this.playAudio()
    }
  },
  // 播放音频
  playAudio() {
    audioContext.play()
    audioContext.duration
    this.setData({
      audioStatus: 'play'
    })
  },
  //  停止音频播放
  stopAduio() {
    if (!audioContext.paused) {
      audioContext.stop()
    }
    this.setData({
      audioStatus: 'stop'
    })
  },
  // 返回上一级
  cancel() {
    wx.navigateBack()
  },
  // 上传
  confirm() {
    if (api.isEmpty(this.data.file.url)) {
      api.toast("没有录音需要保存");
      return
    }
    api.upload(this.data.file.url, '/oral/recording/', this).then(res => {
      this.save(res)
    })
  },
  switchChangeOpen(e) {
    this.setData({
      openFlag: e.detail.value
    })
  },
  switchChangeOriginal(e) {
    this.setData({
      originalFlag: e.detail.value
    })
  },
  // ===========业务操作 End===========
  // ===========数据获取 Start===========
  getData(isPull) {
    const _this = this
    api.request(this, '/v2/p1/detail', {
      userId: api.getUserId(),
      ...this.options
    }, isPull).finally(() => {
      this.finishLoading()
    })
  },
  save(audioUrl) {
    const { file, openFlag, originalFlag } = this.data
    let param = {
      ...this.options,
      userId: api.getUserId(),
      audioUrl: audioUrl,
      duration: file.duration,
      audioCreateTime: file.time,
      publicStatus: openFlag ? '1' : '0',
      originalStatus: originalFlag ? '1' : '0'
    }
    api.request(this, '/v2/p1/single/save', param, true, "POST").then(res => {
      wx.redirectTo({
        url: '../p1-history/index' + api.parseParams(this.options),
      })
    })
  },
})
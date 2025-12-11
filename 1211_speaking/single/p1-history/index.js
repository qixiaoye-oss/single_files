const api = getApp().api
const loadingProgress = require('../../../../behaviors/loadingProgress')
let audio = null
let timer = null
Page({
  behaviors: [loadingProgress],
  data: {
    msg: ""
  },
  // ===========生命周期 Start===========
  onShow() { },
  onLoad(options) {
    this.startLoading()
    api.getUser(this)
    if (options.userId == this.data.user.id || this.data.user.isManager == 1) {
      this.listRecording(false)
    } else {
      api.modal("提示", '暂无权限', false)
      return
    }
    this.getData(true)
    this.listRecording(false)
    audio = wx.createInnerAudioContext()
    audio.onPlay(() => {
      console.log('开始播放', new Date().getTime());
    })
    audio.onEnded(() => {
      this.stopAduio()
    })
    audio.onError((err) => {
      api.audioErr(err, audio.src)
      // api.modal("", "本模块电脑版播放功能需要等待微信官方更新，目前手机/平板可以正常播放。", false)
    })
  },
  onUnload() {
    audio.destroy()
  },
  onShareAppMessage() {
    return api.share('考雅狂狂说', this)
  },
  toDetail(e) {
    // wx.navigateTo({
    //   url: '../../history_record_detail/index?id=' + e.currentTarget.dataset.id + '&userId=' + api.getUserId() + '&mode=single',
    // })
  },
  // ===========生命周期 End===========
  // ===========业务操作 Start===========
  playRecording(e) {
    this.stopAduio()
    let playIndex = e.currentTarget.dataset.index
    let list = this.data.list
    audio.src = list[playIndex].audioUrl
    wx.nextTick(() => {
      audio.play()
    })
    let path = `list[` + playIndex + `].playStatus`
    this.setData({
      [path]: 'play',
    })
  },
  stopAduio() {
    if (!audio.paused) {
      audio.stop()
    }
    let list = this.data.list
    list.forEach((i) => {
      i.playStatus = 'stop'
    })
    this.setData({
      list: list
    })
  },
  audioBtn(e) {
    const { list } = this.data
    let index = e.currentTarget.dataset.index
    const item = list[index]
    if (item.publicStatus == '1') {
      this.audioUpdate1(item.id)
    } else {
      this.audioUpdate2(item.id)
    }
  },
  audioUpdate1(id) {
    wx.showActionSheet({
      itemList: ['取消公开', '删除音频'],
      success: ((res) => {
        if (res.tapIndex === 0) {
          this.delPublic(id)
        }
        if (res.tapIndex === 1) {
          this.delRecording(id)
        }
      })
    })
  },
  audioUpdate2(id) {
    wx.showActionSheet({
      itemList: ['删除音频'],
      success: ((res) => {
        if (res.tapIndex === 0) {
          this.delRecording(id)
        }
      })
    })
  },
  // ===========业务操作 End===========
  // ===========数据获取 Start===========
  getData(isPull) {
    api.request(this, '/v2/p1/detail', {
      ...this.options,
      userId: api.getUserId()
    }, isPull).finally(() => {
      this.finishLoading()
    })
  },
  listRecording(isPull) {
    api.request(this, '/v2/p1/single/user/record', {
      ...this.options,
      userId: api.getUserId()
    }, isPull).finally(() => {
      this.finishLoading()
    })
  },
  delRecording(id) {
    const _this = this
    api.request(this, '/v2/p1/single/remove', {
      id: id
    }, true).then(() => {
      api.toast("删除成功")
      let timer = setTimeout(() => {
        _this.listRecording(false)
        clearTimeout(timer)
      }, 2000);
    })
  },
  delPublic(id) {
    const _this = this
    api.request(this, '/v2/p1/single/public-no', {
      id: id
    }, true).then(() => {
      api.toast("取消成功")
      let timer = setTimeout(() => {
        _this.listRecording(false)
        clearTimeout(timer)
      }, 2000);
    })
  },
  // ===========数据获取 End===========
})
import './keybaseCreate.html'
/* global selectedNetwork */
/* global XMSS_OBJECT */
/* global DEFAULT_NETWORKS */
/* global SHOR_PER_QUANTA */
/* global wrapMeteorCall */
/* global nodeReturnedValidResponse */
/* global otsIndexUsed */

function createKeybaseTxn() {
  // Get transaction values from form
  const sigHash = document.getElementById('message').value
  const txnFee = document.getElementById('fee').value
  const otsKey = document.getElementById('otsKey').value
  const keybase_id = document.getElementById('kb_username').value
  
  // fail if neither checkbox has value
  if (!$('#kb_add').prop('checked') && !$('#kb_remove').prop('checked')) { return }
  let addorremove = ''
    // return message code for keybase action:
    // AA = add, AF = remove
  if ($('#kb_add').prop('checked')) { addorremove = 'AA' } else { addorremove = 'AF' }

  // Fail if OTS Key reuse is detected
  if(otsIndexUsed(Session.get('otsBitfield'), otsKey)) {
    $('#generating').hide()
    $('#otsKeyReuseDetected').modal('show')
    return
  }

  const userMessage = hexToBytes(`0F0F0002${addorremove}`) + ' ' + keybase_id + ' ' + hexToBytes(sigHash)

  // Convert strings to bytes
  const pubKey = hexToBytes(XMSS_OBJECT.getPK())
  const messageBytes = stringToBytes(userMessage)

  // Construct request
  const request = {
    message: messageBytes,
    fee: txnFee * SHOR_PER_QUANTA,
    xmssPk: pubKey,
    network: selectedNetwork(),
  }

  wrapMeteorCall('createKeybaseTxn', request, (err, res) => {
    if (err) {
      Session.set('messageCreationError', err.reason)
      $('#messageCreationFailed').show()
      $('#messageCreateForm').hide()
    } else {
      const confirmation = {
        hash: res.txnHash,
        message: bytesToString(res.response.extended_transaction_unsigned.tx.message.message_hash),
        fee: res.response.extended_transaction_unsigned.tx.fee / SHOR_PER_QUANTA,
        otsKey: otsKey,
      }

      if (nodeReturnedValidResponse(request, confirmation, 'createKeybaseTxn')) {
        Session.set('messageCreationConfirmation', confirmation)
        Session.set('messageCreationConfirmationResponse', res.response)

        // Send to confirm page.
        const params = { }
        const path = FlowRouter.path('/tools/keybase/confirm', params)
        FlowRouter.go(path)
      } else {
        $('#invalidNodeResponse').modal('show')
      }
    }
  })
}

// Function to initialise form validation
function initialiseFormValidation() {
  let validationRules = {}

  validationRules['message'] = {
    id: 'message',
    rules: [
      {
        type: 'empty',
        prompt: 'You must enter a message',
      },
      {
        type: 'maxLength[66]',
        prompt: 'The max length of a message is 80 bytes.',
      },
    ],
  }

  validationRules['kb_username'] = {
    id: 'kb_username',
    rules: [
      {
        type: 'empty',
        prompt: 'You must enter a Keybase username',
      },
      {
        type: 'maxLength[16]',
        prompt: 'The max length of a username is 16 characters.',
      },
    ],
  }

  // Now set fee and otskey validation rules
  validationRules['fee'] = {
    id: 'fee',
    rules: [
      {
        type: 'empty',
        prompt: 'You must enter a fee',
      },
      {
        type: 'number',
        prompt: 'Fee must be a number',
      },
    ],
  }
  validationRules['otsKey'] = {
    id: 'otsKey',
    rules: [
      {
        type: 'empty',
        prompt: 'You must enter an OTS Key Index',
      },
      {
        type: 'number',
        prompt: 'OTS Key Index must be a number',
      },
    ],
  }
  validationRules['kb_action'] = {
    id: 'kb_action',
    rules: [
      {
        type: 'checked',
        prompt: 'You need to select a Keybase action'
      },
    ],
  }

  // Initliase the form validation
  $('.ui.form').form({
    fields: validationRules,
  })
}

Template.appKeybaseCreate.onRendered(() => {
  // Initialise dropdowns
  $('.ui.dropdown').dropdown()

  // Initialise Form Validation
  initialiseFormValidation()

  // Get wallet balance
  getBalance(getXMSSDetails().address, function() {
    // Show warning is otsKeysRemaining is low
    if(Session.get('otsKeysRemaining') < 50) {
      // Shown low OTS Key warning modal
      $('#lowOtsKeyWarning').modal('transition', 'disable').modal('show')
    }
  })
})

Template.appKeybaseCreate.events({
  'submit #generateMessageForm': (event) => {
    event.preventDefault()
    event.stopPropagation()
    $('#generating').show()

    setTimeout(() => { createKeybaseTxn() }, 200)
  },
})

Template.appKeybaseCreate.helpers({
  transferFrom() {
    const transferFrom = {}
    transferFrom.balance = Session.get('transferFromBalance')
    transferFrom.address = hexOrB32(Session.get('transferFromAddress'))
    return transferFrom
  },
  transactionConfirmation() {
    const confirmation = Session.get('transactionConfirmation')
    return confirmation
  },
  transactionConfirmationAmount() {
    const confirmationAmount = Session.get('transactionConfirmationAmount')
    return confirmationAmount
  },
  transactionConfirmationFee() {
    const transactionConfirmationFee = Session.get('transactionConfirmationFee')
    return transactionConfirmationFee
  },
  transactionGenerationError() {
    const error = Session.get('transactionGenerationError')
    return error
  },
  otsKeyEstimate() {
    const otsKeyEstimate = Session.get('otsKeyEstimate')
    return otsKeyEstimate
  },
  otsKeysRemaining() {
    const otsKeysRemaining = Session.get('otsKeysRemaining')
    return otsKeysRemaining
  },
  messageCreationError() {
    const messageCreationError = Session.get('messageCreationError')
    return messageCreationError
  },
  nodeExplorerUrl() {
    if ((Session.get('nodeExplorerUrl') === '') || (Session.get('nodeExplorerUrl') === null)) {
      return DEFAULT_NETWORKS[0].explorerUrl
    }
    return Session.get('nodeExplorerUrl')
  },
})

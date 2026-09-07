import { normalizeText } from '../utils/gameUtils.js';

const brassBirmingham = {
  version: 1,
  intro:
    'Bạn đang gây dựng một đế chế công nghiệp giữa nước Anh thời Cách mạng Công nghiệp. Cái hay của Brass là chẳng ai có thể tự làm mọi thứ. Bạn có thể đi nhờ đường, dùng tài nguyên của đối thủ, nhưng đôi khi chính việc đó lại giúp nhà máy của họ hoạt động và sinh lời.',
  objective:
    'Trải qua Thời Kênh đào và Thời Đường sắt, ai có nhiều điểm chiến thắng (VP) nhất sẽ thắng. Tuyến đường phải nối tới nơi làm ăn nhộn nhịp, còn cơ sở công nghiệp phải hoạt động được và lật mặt thì mới ghi điểm.',
  memoryLine:
    'Xây xong chưa có nghĩa là thành công. Hàng phải bán được hoặc tài nguyên phải được dùng hết thì cơ sở mới thật sự có giá trị.',
  sections: [
    {
      id: 'foundation',
      title: 'Lượt chơi và đường nối',
      tone: 'blue',
      items: [
        {
          id: 'turn-flow',
          icon: '⏱️',
          title: 'Một lượt có 2 hành động',
          summary: 'Mỗi hành động bỏ 1 lá — riêng vòng đầu chỉ được làm 1 hành động.',
          rules: [
            'Thông thường, mỗi lượt bạn được làm 2 hành động.',
            'Riêng vòng đầu tiên của Thời Kênh đào, mỗi người chỉ được làm 1 hành động.',
            'Mỗi hành động phải bỏ 1 lá, kể cả khi chọn Bỏ lượt (Pass). Bạn có thể làm cùng một loại hành động hai lần.',
            'Làm xong lượt, rút bài cho đủ 8 lá nếu chồng bài vẫn còn. Lá Wild dùng xong được trả về chỗ cũ, không cho vào chồng bài bỏ.',
            'Chỉ hành động Xây mới bắt buộc dùng đúng loại lá.',
            'Với các hành động còn lại, bạn có thể bỏ lá nào cũng được.',
          ],
          logic:
            'Hãy xem mỗi lá bài như một cơ hội làm ăn hoặc một mối quan hệ. Dù bạn đầu tư hay đứng ngoài, thời gian vẫn trôi và cơ hội ấy vẫn qua đi.',
          warning: 'Bỏ cả hai hành động vẫn phải bỏ tổng cộng 2 lá bài.',
        },
        {
          id: 'network-vs-connected',
          icon: '🔗',
          title: '“Mạng của bạn” khác với “có đường nối”',
          summary: 'Mạng riêng để mở rộng — đường nối chung để chở hàng và bán hàng.',
          rules: [
            'Một thành phố nằm trong mạng của bạn khi ở đó có cơ sở của bạn, hoặc thành phố đó nằm ở đầu một tuyến đường do bạn xây.',
            'Hai nơi được xem là có đường nối khi có thể lần theo một chuỗi kênh đào hoặc đường sắt liền mạch. Đường của ai cũng được.',
            'Khi dùng thẻ Ngành hoặc xây thêm tuyến, hãy kiểm tra mạng riêng của bạn.',
            'Khi chở than, lấy bia của đối thủ hoặc bán hàng, chỉ cần có đường nối liền mạch.',
          ],
          logic:
            'Cơ sở và tuyến đường của bạn đánh dấu khu vực công ty đã vươn tới, nên đó là nơi bạn có thể mở dự án mới. Nhưng đường của đối thủ vẫn là đường thật, vì vậy hàng hóa của mọi người đều có thể đi qua.',
          memory: 'MỞ RỘNG: dùng mạng của mình · CHỞ HÀNG: dùng đường của bất kỳ ai',
        },
      ],
    },
    {
      id: 'resources',
      title: 'Tài nguyên — ba chỗ dễ nhầm',
      tone: 'resource',
      items: [
        {
          id: 'coal',
          icon: '⚫',
          title: 'Lấy Than',
          summary: 'Phải có đường nối — luôn lấy từ mỏ gần nhất trước.',
          rules: [
            'Bạn cần than để xây một số loại cơ sở và mọi tuyến đường sắt.',
            'Sau khi đặt cơ sở hoặc đường sắt, vị trí vừa đặt phải có đường nối tới một nguồn than hợp lệ.',
            'Nếu trên bản đồ có mỏ than nối tới đó, bạn bắt buộc lấy than miễn phí từ mỏ gần nhất chưa lật. Mỏ của ai cũng lấy được.',
            'Độ gần được tính bằng số tuyến đường phải đi qua. Nếu có nhiều mỏ cùng khoảng cách, bạn tự chọn một mỏ.',
            'Nếu cần thêm than, tiếp tục lấy từ nguồn gần nhất còn lại.',
            'Chỉ khi không còn mỏ than nào có đường nối tới nơi cần dùng, bạn mới được mua từ ô rẻ nhất của Thị trường Than.',
            'Muốn mua than ngoài thị trường, nơi cần than phải có đường nối tới biểu tượng thương mại ở rìa bản đồ.',
            'Nếu thị trường đã hết than, bạn vẫn có thể mua với giá £8 mỗi khối.',
          ],
          logic:
            'Than vừa nặng vừa phải chở với số lượng lớn. Xe ngựa không kham nổi, nên bắt buộc phải vận chuyển bằng kênh đào hoặc đường sắt. Lấy từ mỏ gần nhất cũng là cách tiết kiệm công sức vận chuyển nhất.',
          memory: 'THAN NẶNG → CẦN ĐƯỜNG → LẤY GẦN NHẤT',
          warning: 'Không được bỏ qua than có sẵn trên bản đồ để tự ý mua ngoài thị trường.',
        },
        {
          id: 'iron',
          icon: '🟠',
          title: 'Lấy Sắt',
          summary: 'Lấy ở đâu trên bản đồ cũng được — không cần nối đường.',
          rules: [
            'Bạn cần sắt để Phát triển (Develop) và xây một số loại cơ sở.',
            'Có thể lấy sắt miễn phí từ bất kỳ Xưởng Sắt chưa lật nào còn hàng. Không cần nối đường và cũng không phải chọn xưởng gần nhất.',
            'Nếu cần nhiều khối sắt, mỗi khối có thể lấy từ một xưởng khác nhau.',
            'Chỉ khi tất cả Xưởng Sắt chưa lật trên bản đồ đều hết sắt, bạn mới được mua từ ô rẻ nhất của Thị trường Sắt.',
            'Nếu thị trường đã hết sắt, bạn vẫn có thể mua với giá £6 mỗi khối.',
          ],
          logic:
            'Mỗi công trình chỉ cần một lượng sắt vừa phải, xe ngựa vẫn có thể chở được. Vì vậy trò chơi coi việc giao sắt bằng đường bộ là chuyện đương nhiên và không bắt bạn phải nối kênh đào hay đường sắt.',
          memory: 'SẮT ÍT → XE NGỰA CHỞ ĐƯỢC → KHÔNG CẦN ĐƯỜNG',
          warning: 'Chỉ cần trên bản đồ còn 1 khối sắt thì bạn chưa được mua sắt ngoài thị trường.',
        },
        {
          id: 'beer',
          icon: '🍺',
          title: 'Lấy Bia',
          summary: 'Bia của bạn không cần đường — bia của người khác thì cần.',
          rules: [
            'Bạn cần bia để bán Bông, Hàng chế tạo, Gốm và để xây 2 tuyến đường sắt trong cùng một hành động.',
            'Bia từ Nhà máy bia của chính bạn có thể dùng ở bất cứ đâu, không cần nối đường.',
            'Muốn dùng bia từ Nhà máy bia của đối thủ, nơi cần bia phải có đường nối tới nhà máy đó.',
            'Bia nằm cạnh thương nhân chỉ được dùng khi bạn bán đúng loại hàng cho chính thương nhân đó.',
            'Nếu cần nhiều thùng bia, bạn có thể lấy mỗi thùng từ một nguồn khác nhau.',
            'Nhà máy bia xây trong Thời Kênh đào có 1 thùng. Xây trong Thời Đường sắt có 2 thùng.',
          ],
          logic:
            'Thời đó, nước sạch ở các đô thị công nghiệp còn khan hiếm, nên bia là thức uống quen thuộc của công nhân và cũng giúp các thương vụ diễn ra thuận lợi. Bia của bạn được xem là đã có người lo chuyện vận chuyển. Còn muốn dùng bia của đối thủ, bạn phải có đường để chở về.',
          memory: 'BIA CỦA MÌNH: dùng tự do · BIA CỦA NGƯỜI KHÁC: phải có đường nối',
        },
      ],
    },
    {
      id: 'actions',
      title: 'Các hành động trong lượt',
      tone: 'gold',
      items: [
        {
          id: 'build',
          icon: '🏭',
          title: 'Xây dựng',
          summary: 'Dùng đúng lá bài, lấy miếng cấp thấp nhất rồi trả đủ chi phí.',
          rules: [
            'Dùng thẻ Địa điểm: được xây một ngành hợp lệ tại thành phố ghi trên lá, kể cả khi thành phố đó chưa nằm trong mạng của bạn.',
            'Dùng thẻ Ngành: chỉ được xây đúng ngành ghi trên lá và phải xây trong mạng của bạn.',
            'Lá Wild Địa điểm hoặc Wild Ngành thay cho loại thẻ tương ứng.',
            'Lấy miếng công nghiệp cấp thấp nhất còn lại của ngành đó trên bảng cá nhân.',
            'Nếu thành phố còn ô chỉ dành riêng cho ngành đang xây, bạn phải dùng ô đó trước.',
            'Chỉ được dùng ô có hai biểu tượng khi không còn ô riêng phù hợp.',
            'Trả số tiền in bên trái miếng công nghiệp, sau đó dùng đủ than và sắt theo yêu cầu.',
            'Nếu công trình cần than, sau khi đặt xuống nó phải có đường nối tới một nguồn than hợp lệ.',
            'Trong Thời Kênh đào, mỗi người chỉ được có 1 cơ sở tại mỗi thành phố. Sang Thời Đường sắt, một người có thể sở hữu nhiều cơ sở trong cùng thành phố.',
          ],
          logic:
            'Thẻ Địa điểm tượng trưng cho mối quan hệ và giấy phép tại một thành phố. Thẻ Ngành là chuyên môn mà công ty có thể mang tới những nơi mình đã đặt chân đến. Công nghệ phải nâng từng cấp vì không doanh nghiệp nào có thể bỏ qua hết các thế hệ máy móc cũ.',
          warning: 'Hai Nhà máy bia ở Nông trại chỉ xây được bằng thẻ Nhà máy bia hoặc Wild Ngành. Không dùng được Wild Địa điểm.',
        },
        {
          id: 'market-launch',
          icon: '📈',
          title: 'Bán Than hoặc Sắt vừa xây',
          summary: 'Chỉ bán ngay lúc vừa xây — lấp ô có giá cao nhất trước.',
          rules: [
            'Mỏ Than vừa xây mà có đường nối tới bất kỳ khu thương nhân nào phải bán vào Thị trường Than nhiều nhất có thể.',
            'Xưởng Sắt vừa xây phải bán vào Thị trường Sắt nhiều nhất có thể. Sắt không cần đường nối.',
            'Luôn lấp các ô có giá cao nhất còn trống trước, rồi nhận số tiền in cạnh từng ô vừa lấp.',
            'Nếu khối tài nguyên cuối cùng rời khỏi miếng công nghiệp, lật cơ sở và tăng thu nhập ngay.',
            'Than và sắt chỉ tự động bán ra thị trường ngay trong hành động xây cơ sở đó.',
            'Nếu tới lượt sau bạn mới nối được đường ra thị trường thì không được bán bù.',
          ],
          logic:
            'Có thể hiểu đây là hợp đồng bán sỉ ký ngay ngày khai trương. Thị trường càng thiếu hàng thì giá càng cao. Hàng được đưa vào nhiều, giá sẽ dần hạ xuống.',
        },
        {
          id: 'canal',
          icon: '🛶',
          title: 'Xây Kênh đào',
          summary: 'Trả £3 để đặt 1 tuyến nối với mạng của bạn.',
          rules: [
            'Bỏ 1 lá bất kỳ, trả £3 rồi đặt tối đa 1 tuyến kênh vào một đường kênh còn trống.',
            'Tuyến mới phải chạm vào một thành phố đang nằm trong mạng của bạn.',
            'Xây kênh không tốn than.',
            'Nếu trên bản đồ bạn chưa có cả cơ sở lẫn tuyến đường, có thể đặt tuyến đầu tiên vào bất kỳ đường kênh hợp lệ nào.',
          ],
          logic:
            'Kênh đào chủ yếu được đào bằng sức người nên xây chậm, nhưng chưa cần đầu máy và than. Công ty phải bắt đầu từ nơi mình đã có người, vốn hoặc cơ sở làm ăn.',
        },
        {
          id: 'rail',
          icon: '🚂',
          title: 'Xây Đường sắt',
          summary: 'Mỗi tuyến tốn 1 than — muốn xây 2 tuyến cần £15 và 1 bia.',
          rules: [
            'Xây 1 tuyến: bỏ 1 lá, trả £5, đặt tuyến nối với mạng của bạn rồi dùng 1 than.',
            'Xây 2 tuyến trong cùng một hành động: trả tổng cộng £15, dùng 2 than và 1 bia từ một Nhà máy bia. Không được dùng bia của thương nhân.',
            'Phải đặt từng tuyến theo thứ tự. Đặt tuyến đầu tiên, kiểm tra đường tới nguồn than và dùng than xong rồi mới được đặt tuyến thứ hai.',
            'Nếu dùng bia của đối thủ để xây 2 tuyến, sau khi tuyến thứ hai được đặt, tuyến đó phải có đường nối tới Nhà máy bia đã lấy bia.',
          ],
          logic:
            'Đường sắt cần đầu máy và nhiên liệu nên mỗi tuyến đều tốn than. Làm hai tuyến cùng lúc là một dự án gấp, cần thêm tiền và bia để huy động đội thi công.',
          warning: 'Không được đặt cả hai tuyến xuống rồi mới quay lại kiểm tra nguồn than.',
        },
        {
          id: 'develop',
          icon: '💡',
          title: 'Phát triển công nghệ',
          summary: 'Bỏ 1–2 miếng cấp thấp nhất — mỗi miếng tốn 1 sắt.',
          rules: [
            'Bỏ 1 lá bất kỳ, sau đó loại khỏi trò chơi 1 hoặc 2 miếng công nghiệp trên bảng cá nhân.',
            'Miếng bị loại phải là cấp thấp nhất còn lại của ngành đã chọn. Hai miếng không nhất thiết phải cùng ngành.',
            'Mỗi miếng bị loại tốn 1 sắt.',
            'Miếng Gốm có biểu tượng bóng đèn không thể bỏ bằng hành động Phát triển. Bạn phải đưa miếng này ra bản đồ bằng hành động Xây.',
          ],
          logic:
            'Phát triển (Develop) nghĩa là bỏ qua mẫu máy móc cũ để chuẩn bị xây công nghệ mới, chứ chưa phải dựng nhà máy. Việc nâng cấp cần sắt để chế tạo thiết bị. Riêng các lò Gốm thử nghiệm phải được xây thật, không thể chỉ nghiên cứu trên giấy.',
        },
        {
          id: 'sell',
          icon: '📦',
          title: 'Bán hàng',
          summary: 'Nối tới đúng thương nhân, dùng đủ bia rồi lật cơ sở đã bán.',
          rules: [
            'Bỏ 1 lá bất kỳ rồi chọn một Xưởng Dệt, Xưởng Sản xuất hoặc Lò Gốm chưa lật của bạn.',
            'Cơ sở đó phải có đường nối tới một thương nhân đang mua đúng loại hàng.',
            'Dùng số bia in trên miếng công nghiệp, lật miếng đó rồi tăng thu nhập đúng số ô được ghi.',
            'Trong cùng một hành động Bán hàng (Sell), bạn có thể bán thêm bao nhiêu cơ sở hợp lệ cũng được, kể cả khác ngành hoặc khác thương nhân.',
            'Mỗi cơ sở phải tự có đúng đường nối và đủ bia. Bạn không được chọn Bán hàng nếu không thể hoàn tất ít nhất một lần bán.',
          ],
          logic:
            'Nhà máy mới xây chỉ mới có khả năng sản xuất. Nó chỉ bắt đầu sinh lời khi hàng thật sự tới tay người mua. Một chuyến đi buôn có thể chốt nhiều hợp đồng, vì vậy một hành động được phép bán hàng từ nhiều cơ sở.',
          warning: 'Một hành động Bán hàng không bị giới hạn ở một cơ sở.',
        },
        {
          id: 'merchant-beer',
          icon: '🎁',
          title: 'Dùng Bia của thương nhân',
          summary: 'Bán đúng mặt hàng để dùng bia và nhận phần thưởng.',
          rules: [
            'Khi bán đúng mặt hàng cho một thương nhân, bạn có thể dùng thùng bia nằm cạnh ô thương nhân đó.',
            'Gloucester: bỏ miễn phí 1 miếng công nghiệp cấp thấp nhất mà không tốn sắt. Không được bỏ miếng Gốm có bóng đèn.',
            'Oxford: tăng thu nhập 2 ô.',
            'Nottingham hoặc Shrewsbury: nhận số VP in trên bản đồ.',
            'Warrington: nhận £5.',
            'Bạn không bắt buộc phải dùng bia của thương nhân. Có thể dùng bia từ nơi khác để dành phần thưởng này cho lần bán sau.',
          ],
          logic:
            'Đây là ưu đãi dành cho người mang hàng tới trước. Thương nhân hỗ trợ vốn, mối quan hệ hoặc kỹ thuật để thu hút nhà cung cấp về khu buôn bán của họ.',
        },
        {
          id: 'loan',
          icon: '💷',
          title: 'Vay £30',
          summary: 'Nhận £30 ngay — lùi 3 mức thu nhập, không phải 3 ô.',
          rules: [
            'Bỏ 1 lá bất kỳ rồi nhận £30 từ ngân hàng.',
            'Lùi dấu thu nhập đúng 3 mức, sau đó đặt dấu vào ô cao nhất của mức mới.',
            'Không được vay nếu mức thu nhập sẽ xuống dưới −10.',
            'Bạn không phải trả lại trực tiếp khoản tiền đã vay.',
          ],
          logic:
            'Tiền lãi và khoản phải trả đã được gộp vào thu nhập tương lai. Bạn không phải trả lại tiền gốc, nhưng từ những vòng sau sẽ nhận ít tiền hơn.',
          warning: 'Tiền mặt và thu nhập còn lại cuối trò chơi không tự đổi thành VP.',
        },
        {
          id: 'scout',
          icon: '🔭',
          title: 'Trinh sát',
          summary: 'Bỏ tổng cộng 3 lá để lấy 2 lá Wild khác loại.',
          rules: [
            'Bỏ 1 lá để thực hiện hành động, sau đó bỏ thêm 2 lá nữa. Tổng cộng là 3 lá.',
            'Lấy 1 Wild Địa điểm và 1 Wild Ngành.',
            'Không được Trinh sát (Scout) nếu trên tay đang có bất kỳ lá Wild nào.',
          ],
          logic:
            'Bạn bỏ ba cơ hội cụ thể để đi khảo sát thị trường, đổi lại hai lựa chọn linh hoạt hơn. Một lá cho phép chọn thành phố, lá còn lại cho phép chọn ngành.',
        },
        {
          id: 'overbuild',
          icon: '⬆️',
          title: 'Nâng cấp hoặc xây đè',
          summary: 'Thay bằng miếng cùng ngành, cấp cao hơn — xây đè đối thủ rất khó.',
          rules: [
            'Bạn được thay cơ sở của mình bằng một miếng cùng ngành có cấp cao hơn.',
            'Vẫn phải dùng đúng lá Xây, trả đủ tiền và dùng đủ than, sắt như khi xây mới.',
            'Tài nguyên còn trên miếng cũ được trả về kho chung. Miếng cũ bị loại khỏi trò chơi và không còn ghi điểm.',
            'Với cơ sở của đối thủ, bạn chỉ được xây đè Mỏ Than hoặc Xưởng Sắt.',
            'Muốn xây đè đối thủ, loại tài nguyên tương ứng phải hết sạch ở tất cả cơ sở trên bản đồ và cả ngoài thị trường.',
            'Thu nhập hoặc VP đã nhận từ cơ sở bị đè vẫn được giữ nguyên.',
          ],
          logic:
            'Bạn luôn có quyền hiện đại hóa tài sản của mình. Nhưng chỉ khi cả nền kinh tế đã cạn sạch một loại tài nguyên, nhà máy cũ của đối thủ mới được xem là không còn đáp ứng nhu cầu và có thể bị thay thế.',
        },
      ],
    },
    {
      id: 'round-and-scoring',
      title: 'Cuối vòng, hết thời kỳ và tính điểm',
      tone: 'green',
      items: [
        {
          id: 'flip-industry',
          icon: '🔄',
          title: 'Khi nào được lật cơ sở?',
          summary: 'Hàng hóa lật khi bán — mỏ, xưởng sắt và nhà máy bia lật khi hết hàng.',
          rules: [
            'Xưởng Dệt, Xưởng Sản xuất và Lò Gốm lật mặt sau khi bán hàng thành công.',
            'Mỏ Than, Xưởng Sắt và Nhà máy bia lật ngay khi khối tài nguyên cuối cùng bị lấy, kể cả khi đối thủ là người lấy.',
            'Khi cơ sở lật mặt, tăng thu nhập ngay theo số ô in trên miếng. Chưa nhận VP ở thời điểm này.',
            'VP trên miếng công nghiệp chỉ được tính khi kết thúc thời kỳ. Cơ sở chưa lật không ghi VP.',
          ],
          logic:
            'Một cơ sở chỉ chứng minh được hiệu quả khi bán được hàng hoặc khi toàn bộ sản lượng đã có người dùng. Lợi nhuận giúp thu nhập tăng ngay, còn giá trị lâu dài sẽ được tổng kết vào cuối thời kỳ.',
        },
        {
          id: 'turn-order',
          icon: '💸',
          title: 'Ai đi trước ở vòng sau?',
          summary: 'Ai tiêu ít tiền nhất sẽ đi trước — bằng nhau thì giữ thứ tự cũ.',
          rules: [
            'Cuối vòng, cộng số tiền mỗi người đã đặt trên thẻ nhân vật của mình.',
            'Người chi ít tiền nhất được đi trước. Người chi nhiều nhất đi sau.',
            'Nếu chi bằng nhau, những người đó giữ nguyên thứ tự của vòng hiện tại.',
            'Xếp thứ tự xong, trả toàn bộ số tiền đã chi về ngân hàng.',
          ],
          logic:
            'Công ty vừa đổ nhiều tiền vào dự án cần thời gian để hoàn tất công việc. Công ty chi ít hơn còn dư sức xoay xở, nên có thể phản ứng sớm ở vòng tiếp theo.',
        },
        {
          id: 'income',
          icon: '💰',
          title: 'Nhận thu nhập cuối vòng',
          summary: 'Thu nhập dương thì nhận tiền — thu nhập âm thì phải trả.',
          rules: [
            'Cuối mỗi vòng, nhận số tiền bằng mức thu nhập hiện tại. Nếu thu nhập đang âm, phải trả ngân hàng số tiền tương ứng.',
            'Sau vòng cuối cùng của trò chơi, không nhận thu nhập nữa.',
            'Nếu không đủ tiền để trả mức thu nhập âm, bạn phải gỡ cơ sở của mình khỏi bản đồ để bán tháo.',
            'Mỗi cơ sở bán tháo chỉ nhận được một nửa giá xây, làm tròn xuống. Khi đã đủ tiền trả thì phải dừng gỡ.',
            'Nếu bán hết mức có thể mà vẫn thiếu, mất 1 VP cho mỗi £1 còn nợ nếu bạn còn VP.',
          ],
          logic:
            'Thu nhập thể hiện dòng tiền hằng kỳ. Khi tiền phải trả nhiều hơn tiền kiếm được, công ty buộc phải bán tháo tài sản nên chỉ thu về một phần giá trị ban đầu.',
        },
        {
          id: 'link-scoring',
          icon: '🛤️',
          title: 'Tính điểm tuyến',
          summary: 'Mỗi tuyến ghi điểm theo các biểu tượng ở hai đầu đường.',
          rules: [
            'Với từng tuyến của bạn, đếm tất cả biểu tượng tuyến đang hiện ở hai thành phố đầu đường.',
            'Mỗi biểu tượng cho 1 VP, kể cả biểu tượng trên cơ sở của đối thủ hoặc tại khu thương nhân.',
            'Chấm điểm xong thì gỡ các tuyến khỏi bản đồ.',
          ],
          logic:
            'Một con đường chỉ có giá trị khi nối những nơi đang làm ăn sôi động. Nhà máy của đối thủ cũng tạo người và hàng đi qua đường của bạn, nên đôi khi việc họ phát triển ở hai đầu tuyến lại có lợi cho bạn.',
          memory: 'KHÔNG ĐẾM ĐƯỜNG DÀI BAO NHIÊU → ĐẾM HAI ĐẦU ĐƯỜNG NHỘN NHỊP RA SAO',
        },
        {
          id: 'industry-scoring',
          icon: '🏅',
          title: 'Tính điểm cơ sở công nghiệp',
          summary: 'Chỉ cơ sở đã lật mặt mới nhận số VP in trên miếng.',
          rules: [
            'Sau khi chấm và gỡ các tuyến, cộng số VP ở góc dưới bên trái của mọi miếng công nghiệp đã lật thuộc về bạn.',
            'Cơ sở chưa lật mặt không ghi điểm.',
            'Xây nhiều nhưng chưa bán được hàng hoặc chưa dùng hết tài nguyên thì vẫn không có VP công nghiệp.',
          ],
          logic:
            'Một công trình chưa hoạt động hết công suất chỉ là tiền vốn đang nằm yên. Chỉ những ngành đã thật sự phục vụ nền kinh tế mới để lại dấu ấn.',
        },
        {
          id: 'canal-end',
          icon: '🌊',
          title: 'Chuyển sang Thời Đường sắt',
          summary: 'Gỡ toàn bộ cơ sở cấp 1 — cơ sở cấp 2 trở lên được giữ lại.',
          rules: [
            'Sau khi chấm điểm Thời Kênh đào, gỡ tất cả cơ sở cấp 1 đang nằm trên bản đồ. Miếng cấp 1 còn trên bảng cá nhân vẫn giữ nguyên.',
            'Cơ sở cấp 2 trở lên được giữ lại. Nếu đã lật mặt, chúng có thể ghi VP thêm một lần nữa ở cuối Thời Đường sắt.',
            'Đặt lại 1 thùng bia lên mỗi chỗ bia đang trống cạnh ô thương nhân không phải ô trắng.',
            'Xáo chồng bài bỏ để tạo chồng bài mới, sau đó mỗi người rút 8 lá.',
            'Miếng Gốm cấp 1 chưa xây vẫn có thể được xây trong Thời Đường sắt. Nhưng nếu miếng đó đã nằm trên bản đồ khi hết Thời Kênh đào, nó vẫn bị gỡ như mọi cơ sở cấp 1 khác.',
          ],
          logic:
            'Khi đường sắt xuất hiện, các cơ sở đời đầu không còn theo kịp nền kinh tế quy mô lớn. Cơ sở cấp 2 trở lên đủ hiện đại để tồn tại qua cả hai thời kỳ và có thể ghi dấu ấn thêm một lần nữa.',
        },
        {
          id: 'win',
          icon: '👑',
          title: 'Kết thúc trò chơi và phân định khi hòa',
          summary: 'Ai có nhiều VP nhất sẽ thắng — tiền và thu nhập không tự đổi thành điểm.',
          rules: [
            'Sau khi chấm điểm Thời Đường sắt, người có nhiều VP nhất sẽ thắng.',
            'Nếu bằng VP, người có mức thu nhập cao hơn sẽ thắng.',
            'Nếu vẫn bằng nhau, người còn nhiều tiền mặt hơn sẽ thắng. Nếu vẫn hòa thì cùng thắng.',
            'Tiền mặt và mức thu nhập cuối trò chơi không trực tiếp mang lại VP.',
          ],
          logic:
            'Tiền chỉ là công cụ để bạn xây dựng sự nghiệp. Giữ một két tiền đầy mà không biến nó thành nhà máy hoạt động hay tuyến đường quan trọng thì cũng không để lại thành tựu gì.',
          warning: 'Dòng “tiền thừa đổi điểm” từng có trong Sheet không áp dụng cho luật chuẩn của Brass: Birmingham.',
        },
      ],
    },
  ],
};

const CHEAT_SHEETS_BY_NAME = new Map([
  ['brass: birmingham', brassBirmingham],
  ['brass birmingham', brassBirmingham],
]);

export const getGameCheatSheet = (game) => {
  const normalizedName = normalizeText(game?.name).replace(/\s*:\s*/g, ': ');
  return CHEAT_SHEETS_BY_NAME.get(normalizedName) || null;
};

export { brassBirmingham };

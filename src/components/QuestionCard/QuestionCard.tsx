interface QuestionCardProps {
  text: string;
  content: string;
}

export const QuestionCard = ({ text, content }: QuestionCardProps) => {
  return (
    <div className="w-full max-w-[400px] mx-auto px-4">
      <div className="bg-white rounded-[20px] p-6 w-full">
        <div className="bg-[#131309] rounded-[20px] p-6 mb-4">
          <p className="text-white text-xl text-center">
            {text}
          </p>
        </div>

        <p className="[font-family:'Londrina_Solid'] text-[40px] text-[#131309] text-center">
          {content}
        </p>
      </div>
    </div>
  );
}; 
import pandas as pd


def main():
    df = pd.read_csv("QuestionAttributes.csv")
    df.set_index('Question ID')

    qa_square = [];
    chart_type_combos = [];
    q_c_combos = ["Full", "Partial"];
    chart_types = ["Offset", "Stencil", "Ring", "Exchange"]

    df.groupby(['Question', 'Comparison']).count()['Question ID'].to_csv('q_v_comp.txt', sep='\t')
    df.groupby(['Q_Chart_Type', 'C_Chart_Type']).count()['Question ID'].to_csv('chart_type.txt', sep='\t')
    df.groupby(['Q _Chart_Subtype', 'C_Chart_Subtype']).count()['Question ID'].to_csv('chart_subtype.txt', sep='\t')
    df.groupby(['Q_Chart_Type', 'C_Chart_Type', 'Q _Chart_Subtype', 'C_Chart_Subtype']).count()['Question ID'].to_csv('chart_type_and_subtype.txt', sep='\t')
    df.groupby(['C_Chart_Type', 'C_Chart_Subtype']).count()['Question ID'].to_csv('comparator_type_and_subtype.txt', sep='\t')
    df.groupby(['C_Chart_Type']).count()['Question ID'].to_csv('comparator_type.txt', sep='\t')
    df.groupby(['Q_Chart_Type']).count()['Question ID'].to_csv('q_type.txt', sep='\t')



    pass


main()
